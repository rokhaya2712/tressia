import { type Context, Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { asc, count, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { SALON_STATUSES, type AdminSalonDto, type SalonStatus, type UserDto } from '@tressia/shared'
import { db } from '../../db/client.ts'
import { bookings, salons, services, users } from '../../db/schema.ts'
import { type AppEnv, requireRole } from '../../lib/auth.ts'
import { notFound, validationHook } from '../../lib/http.ts'

export const adminRoutes = new Hono<AppEnv>()
adminRoutes.use('*', requireRole('admin'))

async function listSalons(where?: ReturnType<typeof eq>): Promise<AdminSalonDto[]> {
  const svcCount = db.select({ salonId: services.salonId, n: count().as('svc_n') }).from(services).groupBy(services.salonId).as('svc')
  const bkCount = db.select({ salonId: bookings.salonId, n: count().as('bk_n') }).from(bookings).groupBy(bookings.salonId).as('bk')
  const rows = await db.select({ s: salons, ownerEmail: users.email, ownerName: users.fullName, svcN: svcCount.n, bkN: bkCount.n })
    .from(salons)
    .innerJoin(users, eq(users.id, salons.ownerId))
    .leftJoin(svcCount, eq(svcCount.salonId, salons.id))
    .leftJoin(bkCount, eq(bkCount.salonId, salons.id))
    .where(where)
    .orderBy(desc(salons.createdAt), asc(salons.id))
  return rows.map(({ s, ownerEmail, ownerName, svcN, bkN }) => ({
    id: s.id, slug: s.slug, name: s.name, city: s.city, neighborhood: s.neighborhood, status: s.status,
    ownerEmail, ownerName, createdAt: s.createdAt.toISOString(), serviceCount: Number(svcN ?? 0), bookingCount: Number(bkN ?? 0),
  }))
}

adminRoutes.get('/salons', zValidator('query', z.object({ status: z.enum(SALON_STATUSES).optional() }), validationHook), async (c) => {
  const { status } = c.req.valid('query')
  return c.json({ salons: await listSalons(status ? eq(salons.status, status) : undefined) })
})

const setStatus = (status: SalonStatus) => async (c: Context<AppEnv>) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) throw notFound('Salon introuvable')
  const res = await db.update(salons).set({ status }).where(eq(salons.id, id)).returning({ id: salons.id })
  if (!res.length) throw notFound('Salon introuvable')
  const [salon] = await listSalons(eq(salons.id, id))
  return c.json({ salon })
}
adminRoutes.post('/salons/:id/publish', setStatus('published'))
adminRoutes.post('/salons/:id/suspend', setStatus('suspended'))

adminRoutes.get('/users', async (c) => {
  const rows = await db.select().from(users).orderBy(desc(users.createdAt), desc(users.id))
  const list: (UserDto & { createdAt: string })[] = rows.map((u) => ({ id: u.id, email: u.email, fullName: u.fullName, phone: u.phone, role: u.role, createdAt: u.createdAt.toISOString() }))
  return c.json({ users: list })
})
