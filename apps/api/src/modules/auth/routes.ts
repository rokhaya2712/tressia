import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { loginSchema, registerSchema } from '@tressia/shared'
import { db } from '../../db/client.ts'
import { users } from '../../db/schema.ts'
import { type AppEnv, createSession, destroySession, hashPassword, rateLimit, toUserDto, verifyPassword } from '../../lib/auth.ts'
import { ApiError, conflict, validationHook } from '../../lib/http.ts'

export const authRoutes = new Hono<AppEnv>()

authRoutes.post('/register', rateLimit('auth', 10, 60_000), zValidator('json', registerSchema, validationHook), async (c) => {
  const body = c.req.valid('json')
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email)).limit(1)
  if (existing) throw conflict('email_taken', 'Un compte existe déjà avec cet e-mail')
  const passwordHash = await hashPassword(body.password)
  const inserted = await db.insert(users).values({ email: body.email, passwordHash, fullName: body.fullName, phone: body.phone, role: body.role })
    .onConflictDoNothing({ target: users.email }).returning()
  const user = inserted[0]
  if (!user) throw conflict('email_taken', 'Un compte existe déjà avec cet e-mail')
  await createSession(c, user.id)
  return c.json({ user: toUserDto(user) }, 201)
})

authRoutes.post('/login', rateLimit('auth', 10, 60_000), zValidator('json', loginSchema, validationHook), async (c) => {
  const { email, password } = c.req.valid('json')
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user || !(await verifyPassword(password, user.passwordHash))) throw new ApiError(401, 'invalid_credentials', 'E-mail ou mot de passe incorrect')
  await createSession(c, user.id)
  return c.json({ user: toUserDto(user) })
})

authRoutes.post('/logout', async (c) => {
  await destroySession(c)
  return c.json({ ok: true })
})

authRoutes.get('/me', (c) => c.json({ user: c.get('user') }))
