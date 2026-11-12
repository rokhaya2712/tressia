import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { and, eq, gt } from 'drizzle-orm'
import type { Context, MiddlewareHandler } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Role, UserDto } from '@tressia/shared'
import { db } from '../db/client.ts'
import { salons, sessions, users } from '../db/schema.ts'
import { env } from '../env.ts'
import { forbidden, notFound, unauthorized } from './http.ts'

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>
export const SESSION_COOKIE = 'tressia_session'
const SESSION_DAYS = 30

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`
}
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [, saltHex, keyHex] = stored.split('$')
  if (!saltHex || !keyHex) return false
  const key = await scrypt(password, Buffer.from(saltHex, 'hex'), 64)
  return timingSafeEqual(key, Buffer.from(keyHex, 'hex'))
}

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex')

export async function createSession(c: Context, userId: number) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000)
  await db.insert(sessions).values({ id: sha256(token), userId, expiresAt })
  setCookie(c, SESSION_COOKIE, token, { httpOnly: true, sameSite: 'Lax', secure: env.isProd, path: '/', expires: expiresAt })
}
export async function destroySession(c: Context) {
  const token = getCookie(c, SESSION_COOKIE)
  if (token) await db.delete(sessions).where(eq(sessions.id, sha256(token)))
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
}

export type AuthUser = UserDto
export type AppEnv = { Variables: { user: AuthUser | null } }

export const toUserDto = (u: typeof users.$inferSelect): UserDto => ({ id: u.id, email: u.email, fullName: u.fullName, phone: u.phone, role: u.role })

/** Charge l'utilisateur de la session (ou null) dans c.get('user'). */
export const loadUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set('user', null)
  const token = getCookie(c, SESSION_COOKIE)
  if (token) {
    const rows = await db.select({ user: users }).from(sessions).innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date()))).limit(1)
    if (rows[0]) c.set('user', toUserDto(rows[0].user))
  }
  await next()
}

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.get('user')) throw unauthorized()
  await next()
}
export const requireRole = (...roles: Role[]): MiddlewareHandler<AppEnv> => async (c, next) => {
  const user = c.get('user')
  if (!user) throw unauthorized()
  if (!roles.includes(user.role)) throw forbidden()
  await next()
}
export function currentUser(c: Context<AppEnv>): AuthUser {
  const u = c.get('user')
  if (!u) throw unauthorized()
  return u
}

/** Salon du proprietaire connecte (v1 : un salon par proprietaire). 404 si aucun. */
export async function getOwnedSalon(c: Context<AppEnv>) {
  const user = currentUser(c)
  const [salon] = await db.select().from(salons).where(eq(salons.ownerId, user.id)).limit(1)
  if (!salon) throw notFound("Vous n'avez pas encore créé de salon")
  return salon
}

/** Refuse les requetes mutantes dont l'en-tete Origin n'est pas autorisee. */
export const originGuard: MiddlewareHandler = async (c, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    const origin = c.req.header('origin')
    if (origin && origin !== env.webOrigin && !env.isTest) throw forbidden('Origine non autorisée')
  }
  await next()
}

/** Limiteur en memoire tres simple (par IP et par cle). */
const hits = new Map<string, { count: number; resetAt: number }>()
export const rateLimit = (key: string, max: number, windowMs: number): MiddlewareHandler => async (c, next) => {
  if (env.isTest) return next()
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
  const k = `${key}:${ip}`
  const now = Date.now()
  const entry = hits.get(k)
  if (!entry || entry.resetAt < now) hits.set(k, { count: 1, resetAt: now + windowMs })
  else if (++entry.count > max) return c.json({ error: { code: 'rate_limited', message: 'Trop de tentatives, réessayez dans une minute' } }, 429)
  await next()
}
