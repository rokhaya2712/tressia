import { randomBytes } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, asc, avg, count, eq, gt, gte, lt, notInArray } from 'drizzle-orm'
import sharp from 'sharp'
import { z } from 'zod'
import {
  cancelSchema, closureSchema, hoursSchema, salonInfoSchema, serviceSchema, staffSchema, timeOffSchema, toLocalDate, addDaysYmd, zonedTimeToUtc,
  type ClosureDto, type PhotoDto, type ProStatsDto, type SalonDetailDto, type ServiceDto, type StaffDto, type TimeOffDto,
} from '@tressia/shared'
import { db } from '../../db/client.ts'
import { bookingItems, bookings, categories, closures, openingHours, reviews, salonPhotos, salons, services, staff, staffTimeOff } from '../../db/schema.ts'
import { env } from '../../env.ts'
import { type AppEnv, currentUser, getOwnedSalon, requireRole } from '../../lib/auth.ts'
import { ApiError, badRequest, conflict, notFound, validationHook } from '../../lib/http.ts'
import { cancelledBySalonMail, sendMailSafe } from '../../lib/mailer.ts'
import { loadBooking, loadBookings } from '../bookings/mapper.ts'

export const proRoutes = new Hono<AppEnv>()
proRoutes.use('*', requireRole('owner'))

type Salon = typeof salons.$inferSelect
const hm = (t: string) => t.slice(0, 5)
const parseId = (raw: string | undefined) => {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) throw notFound()
  return id
}

/* ---------- Mappers ---------- */

async function listServices(salonId: number): Promise<ServiceDto[]> {
  const rows = await db.select({ s: services, slug: categories.slug }).from(services).innerJoin(categories, eq(categories.id, services.categoryId))
    .where(eq(services.salonId, salonId)).orderBy(asc(services.position), asc(services.id))
  return rows.map(({ s, slug }) => ({ id: s.id, categoryId: s.categoryId, categorySlug: slug, name: s.name, description: s.description, priceEur: s.priceEur, durationMin: s.durationMin, imageUrl: s.imageUrl, active: s.active, position: s.position }))
}
async function serviceDto(salonId: number, id: number): Promise<ServiceDto> {
  const s = (await listServices(salonId)).find((x) => x.id === id)
  if (!s) throw notFound('Prestation introuvable')
  return s
}
const toStaffDto = (s: typeof staff.$inferSelect): StaffDto => ({ id: s.id, name: s.name, photoUrl: s.photoUrl, bio: s.bio, active: s.active, position: s.position })
const toPhotoDto = (p: typeof salonPhotos.$inferSelect): PhotoDto => ({ id: p.id, url: p.url, position: p.position })
const toClosureDto = (r: typeof closures.$inferSelect): ClosureDto => ({ id: r.id, startsOn: r.startsOn, endsOn: r.endsOn, reason: r.reason })
const toTimeOffDto = (r: typeof staffTimeOff.$inferSelect): TimeOffDto => ({ id: r.id, staffId: r.staffId, startsAt: r.startsAt.toISOString(), endsAt: r.endsAt.toISOString(), reason: r.reason })

async function listHours(salonId: number) {
  const rows = await db.select().from(openingHours).where(eq(openingHours.salonId, salonId)).orderBy(asc(openingHours.weekday), asc(openingHours.opensAt))
  return rows.map((h) => ({ weekday: h.weekday, opensAt: hm(h.opensAt), closesAt: hm(h.closesAt) }))
}

async function salonDetail(salon: Salon): Promise<SalonDetailDto> {
  const [svc, staffRows, photos, hours, [rv]] = await Promise.all([
    listServices(salon.id),
    db.select().from(staff).where(eq(staff.salonId, salon.id)).orderBy(asc(staff.position), asc(staff.id)),
    db.select().from(salonPhotos).where(eq(salonPhotos.salonId, salon.id)).orderBy(asc(salonPhotos.position), asc(salonPhotos.id)),
    listHours(salon.id),
    db.select({ avg: avg(reviews.rating), n: count() }).from(reviews).where(eq(reviews.salonId, salon.id)),
  ])
  const active = svc.filter((s) => s.active)
  return {
    id: salon.id, slug: salon.slug, name: salon.name, city: salon.city, neighborhood: salon.neighborhood, audience: salon.audience, coverUrl: salon.coverUrl,
    rating: rv?.avg != null ? Math.round(Number(rv.avg) * 10) / 10 : null,
    reviewCount: Number(rv?.n ?? 0),
    minPriceEur: active.length ? Math.min(...active.map((s) => s.priceEur)) : null,
    categories: [...new Set(active.map((s) => s.categorySlug))],
    distanceKm: null, lat: salon.lat, lng: salon.lng,
    serviceMode: salon.serviceMode, travelFeeEur: salon.travelFeeEur, travelZone: salon.travelZone,
    description: salon.description, phone: salon.phone, whatsapp: salon.whatsapp, address: salon.address, status: salon.status,
    hours, services: svc, staff: staffRows.map(toStaffDto), photos: photos.map(toPhotoDto),
  }
}

export function slugify(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'salon'
}
async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name)
  for (let i = 1; ; i++) {
    const candidate = i === 1 ? base : `${base}-${i}`
    const [hit] = await db.select({ id: salons.id }).from(salons).where(eq(salons.slug, candidate)).limit(1)
    if (!hit) return candidate
  }
}

/* ---------- Salon ---------- */

proRoutes.post('/salon', zValidator('json', salonInfoSchema, validationHook), async (c) => {
  const user = currentUser(c)
  const input = c.req.valid('json')
  const [existing] = await db.select({ id: salons.id }).from(salons).where(eq(salons.ownerId, user.id)).limit(1)
  if (existing) throw conflict('salon_exists', 'Vous avez déjà un profil de tresseuse.')
  const [salon] = await db.insert(salons).values({ ...input, ownerId: user.id, slug: await uniqueSlug(input.name), status: 'pending' }).returning()
  return c.json({ salon: await salonDetail(salon!) }, 201)
})

proRoutes.get('/salon', async (c) => c.json({ salon: await salonDetail(await getOwnedSalon(c)) }))

proRoutes.patch('/salon', zValidator('json', salonInfoSchema.partial(), validationHook), async (c) => {
  const salon = await getOwnedSalon(c)
  const input = c.req.valid('json')
  const [updated] = Object.keys(input).length ? await db.update(salons).set(input).where(eq(salons.id, salon.id)).returning() : [salon]
  return c.json({ salon: await salonDetail(updated!) })
})

/* ---------- Horaires et fermetures ---------- */

proRoutes.get('/salon/hours', async (c) => c.json({ hours: await listHours((await getOwnedSalon(c)).id) }))

proRoutes.put('/salon/hours', zValidator('json', hoursSchema, validationHook), async (c) => {
  const salon = await getOwnedSalon(c)
  const { hours } = c.req.valid('json')
  hours.forEach((h, i) => {
    if (h.opensAt >= h.closesAt) throw badRequest('validation', "L'heure d'ouverture doit précéder l'heure de fermeture.", { [`hours.${i}.closesAt`]: "Doit être après l'ouverture" })
  })
  await db.transaction(async (tx) => {
    await tx.delete(openingHours).where(eq(openingHours.salonId, salon.id))
    if (hours.length) await tx.insert(openingHours).values(hours.map((h) => ({ salonId: salon.id, ...h })))
  })
  return c.json({ hours: await listHours(salon.id) })
})

proRoutes.get('/salon/closures', async (c) => {
  const salon = await getOwnedSalon(c)
  const rows = await db.select().from(closures).where(eq(closures.salonId, salon.id)).orderBy(asc(closures.startsOn))
  return c.json({ closures: rows.map(toClosureDto) })
})
proRoutes.post('/salon/closures', zValidator('json', closureSchema, validationHook), async (c) => {
  const salon = await getOwnedSalon(c)
  const input = c.req.valid('json')
  if (input.startsOn > input.endsOn) throw badRequest('validation', 'La date de fin doit suivre la date de début.', { endsOn: 'Doit suivre la date de début' })
  const [row] = await db.insert(closures).values({ salonId: salon.id, startsOn: input.startsOn, endsOn: input.endsOn, reason: input.reason ?? null }).returning()
  return c.json({ closure: toClosureDto(row!) }, 201)
})
proRoutes.delete('/salon/closures/:id', async (c) => {
  const salon = await getOwnedSalon(c)
  const del = await db.delete(closures).where(and(eq(closures.id, parseId(c.req.param('id'))), eq(closures.salonId, salon.id))).returning({ id: closures.id })
  if (!del.length) throw notFound('Fermeture introuvable')
  return c.json({ ok: true })
})

/* ---------- Prestations ---------- */

async function assertCategory(categoryId: number | undefined) {
  if (categoryId == null) return
  const [cat] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, categoryId)).limit(1)
  if (!cat) throw badRequest('validation', 'Catégorie inconnue', { categoryId: 'Catégorie inconnue' })
}

proRoutes.get('/services', async (c) => c.json({ services: await listServices((await getOwnedSalon(c)).id) }))

proRoutes.post('/services', zValidator('json', serviceSchema, validationHook), async (c) => {
  const salon = await getOwnedSalon(c)
  const input = c.req.valid('json')
  await assertCategory(input.categoryId)
  const [row] = await db.insert(services).values({ ...input, salonId: salon.id }).returning({ id: services.id })
  return c.json({ service: await serviceDto(salon.id, row!.id) }, 201)
})

proRoutes.patch('/services/:id', zValidator('json', serviceSchema.partial(), validationHook), async (c) => {
  const salon = await getOwnedSalon(c)
  const id = parseId(c.req.param('id'))
  const input = c.req.valid('json')
  await assertCategory(input.categoryId)
  const res = Object.keys(input).length
    ? await db.update(services).set(input).where(and(eq(services.id, id), eq(services.salonId, salon.id))).returning({ id: services.id })
    : await db.select({ id: services.id }).from(services).where(and(eq(services.id, id), eq(services.salonId, salon.id)))
  if (!res.length) throw notFound('Prestation introuvable')
  return c.json({ service: await serviceDto(salon.id, id) })
})

proRoutes.delete('/services/:id', async (c) => {
  const salon = await getOwnedSalon(c)
  const id = parseId(c.req.param('id'))
  const [svc] = await db.select({ id: services.id }).from(services).where(and(eq(services.id, id), eq(services.salonId, salon.id))).limit(1)
  if (!svc) throw notFound('Prestation introuvable')
  const [used] = await db.select({ id: bookingItems.id }).from(bookingItems).where(eq(bookingItems.serviceId, id)).limit(1)
  if (used) {
    await db.update(services).set({ active: false }).where(eq(services.id, id))
    return c.json({ ok: true, deactivated: true })
  }
  await db.delete(services).where(eq(services.id, id))
  return c.json({ ok: true, deactivated: false })
})

/* ---------- Coiffeurs ---------- */

async function ownedStaff(salonId: number, id: number) {
  const [s] = await db.select().from(staff).where(and(eq(staff.id, id), eq(staff.salonId, salonId))).limit(1)
  if (!s) throw notFound('Coiffeur introuvable')
  return s
}

proRoutes.get('/staff', async (c) => {
  const salon = await getOwnedSalon(c)
  const rows = await db.select().from(staff).where(eq(staff.salonId, salon.id)).orderBy(asc(staff.position), asc(staff.id))
  return c.json({ staff: rows.map(toStaffDto) })
})
proRoutes.post('/staff', zValidator('json', staffSchema, validationHook), async (c) => {
  const salon = await getOwnedSalon(c)
  const [row] = await db.insert(staff).values({ ...c.req.valid('json'), salonId: salon.id }).returning()
  return c.json({ staff: toStaffDto(row!) }, 201)
})
proRoutes.patch('/staff/:id', zValidator('json', staffSchema.partial(), validationHook), async (c) => {
  const salon = await getOwnedSalon(c)
  const s = await ownedStaff(salon.id, parseId(c.req.param('id')))
  const input = c.req.valid('json')
  const [row] = Object.keys(input).length ? await db.update(staff).set(input).where(eq(staff.id, s.id)).returning() : [s]
  return c.json({ staff: toStaffDto(row!) })
})
proRoutes.delete('/staff/:id', async (c) => {
  const salon = await getOwnedSalon(c)
  const s = await ownedStaff(salon.id, parseId(c.req.param('id')))
  const [future] = await db.select({ id: bookings.id }).from(bookings)
    .where(and(eq(bookings.staffId, s.id), eq(bookings.status, 'confirmed'), gt(bookings.endsAt, new Date()))).limit(1)
  if (future) throw conflict('staff_has_bookings', 'Ce coiffeur a encore des rendez-vous à venir. Annulez-les ou réaffectez-les avant de le retirer.')
  const [any] = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.staffId, s.id)).limit(1)
  if (any) {
    await db.update(staff).set({ active: false }).where(eq(staff.id, s.id))
    return c.json({ ok: true, deactivated: true })
  }
  await db.delete(staff).where(eq(staff.id, s.id))
  return c.json({ ok: true, deactivated: false })
})

proRoutes.get('/staff/:id/time-off', async (c) => {
  const salon = await getOwnedSalon(c)
  const s = await ownedStaff(salon.id, parseId(c.req.param('id')))
  const rows = await db.select().from(staffTimeOff).where(eq(staffTimeOff.staffId, s.id)).orderBy(asc(staffTimeOff.startsAt))
  return c.json({ timeOff: rows.map(toTimeOffDto) })
})
proRoutes.post('/staff/:id/time-off', zValidator('json', timeOffSchema, validationHook), async (c) => {
  const salon = await getOwnedSalon(c)
  const s = await ownedStaff(salon.id, parseId(c.req.param('id')))
  const input = c.req.valid('json')
  const startsAt = new Date(input.startsAt)
  const endsAt = new Date(input.endsAt)
  if (startsAt >= endsAt) throw badRequest('validation', 'La fin doit suivre le début.', { endsAt: 'Doit suivre le début' })
  const [row] = await db.insert(staffTimeOff).values({ staffId: s.id, startsAt, endsAt, reason: input.reason ?? null }).returning()
  return c.json({ timeOff: toTimeOffDto(row!) }, 201)
})
proRoutes.delete('/staff/:id/time-off/:offId', async (c) => {
  const salon = await getOwnedSalon(c)
  const s = await ownedStaff(salon.id, parseId(c.req.param('id')))
  const del = await db.delete(staffTimeOff).where(and(eq(staffTimeOff.id, parseId(c.req.param('offId'))), eq(staffTimeOff.staffId, s.id))).returning({ id: staffTimeOff.id })
  if (!del.length) throw notFound('Indisponibilité introuvable')
  return c.json({ ok: true })
})

/* ---------- Galerie ---------- */

async function listPhotos(salonId: number) {
  const rows = await db.select().from(salonPhotos).where(eq(salonPhotos.salonId, salonId)).orderBy(asc(salonPhotos.position), asc(salonPhotos.id))
  return rows.map(toPhotoDto)
}
proRoutes.get('/gallery', async (c) => c.json({ photos: await listPhotos((await getOwnedSalon(c)).id) }))
proRoutes.post('/gallery', zValidator('json', z.object({ url: z.string().trim().min(1).max(500) }), validationHook), async (c) => {
  const salon = await getOwnedSalon(c)
  const [{ n }] = (await db.select({ n: count() }).from(salonPhotos).where(eq(salonPhotos.salonId, salon.id))) as [{ n: number }]
  const [row] = await db.insert(salonPhotos).values({ salonId: salon.id, url: c.req.valid('json').url, position: Number(n) }).returning()
  return c.json({ photo: toPhotoDto(row!) }, 201)
})
proRoutes.delete('/gallery/:id', async (c) => {
  const salon = await getOwnedSalon(c)
  const del = await db.delete(salonPhotos).where(and(eq(salonPhotos.id, parseId(c.req.param('id'))), eq(salonPhotos.salonId, salon.id))).returning({ id: salonPhotos.id })
  if (!del.length) throw notFound('Photo introuvable')
  return c.json({ ok: true })
})
proRoutes.patch('/gallery', zValidator('json', z.object({ ids: z.array(z.number().int()) }), validationHook), async (c) => {
  const salon = await getOwnedSalon(c)
  const { ids } = c.req.valid('json')
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) await tx.update(salonPhotos).set({ position: i }).where(and(eq(salonPhotos.id, id), eq(salonPhotos.salonId, salon.id)))
  })
  return c.json({ photos: await listPhotos(salon.id) })
})

/* ---------- Televersement ---------- */

const MAX_UPLOAD = 5 * 1024 * 1024
function isImage(buf: Buffer): boolean {
  if (buf.length < 12) return false
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  const png = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  const webp = buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP'
  return jpeg || png || webp
}

proRoutes.post('/uploads', async (c) => {
  await getOwnedSalon(c)
  const body = await c.req.parseBody()
  const file = body.file
  if (!(file instanceof File)) throw badRequest('validation', 'Aucun fichier reçu.', { file: 'Fichier requis' })
  if (file.size > MAX_UPLOAD) throw new ApiError(413, 'file_too_large', "L'image dépasse 5 Mo.")
  const buf = Buffer.from(await file.arrayBuffer())
  if (buf.length > MAX_UPLOAD) throw new ApiError(413, 'file_too_large', "L'image dépasse 5 Mo.")
  if (!isImage(buf)) throw badRequest('invalid_file', 'Formats acceptés : JPEG, PNG ou WebP.')
  const name = `${randomBytes(12).toString('hex')}.webp`
  await mkdir(env.uploadsDir, { recursive: true })
  try {
    await sharp(buf).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toFile(join(env.uploadsDir, name))
  } catch {
    throw badRequest('invalid_file', "Cette image n'a pas pu être lue.")
  }
  return c.json({ url: `/uploads/${name}` }, 201)
})

/* ---------- Agenda ---------- */

const agendaQuery = z.object({
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  staffId: z.coerce.number().int().optional(),
})

proRoutes.get('/bookings', zValidator('query', agendaQuery, validationHook), async (c) => {
  const salon = await getOwnedSalon(c)
  const q = c.req.valid('query')
  const conds = [eq(bookings.salonId, salon.id)]
  if (q.from) conds.push(gte(bookings.startsAt, new Date(q.from)))
  if (q.to) conds.push(lt(bookings.startsAt, new Date(q.to)))
  if (q.staffId) conds.push(eq(bookings.staffId, q.staffId))
  return c.json({ bookings: await loadBookings(and(...conds)) })
})

async function ownedBooking(salonId: number, id: number) {
  const [b] = await db.select().from(bookings).where(and(eq(bookings.id, id), eq(bookings.salonId, salonId))).limit(1)
  if (!b) throw notFound('Rendez-vous introuvable')
  return b
}

proRoutes.post('/bookings/:id/cancel', zValidator('json', cancelSchema, validationHook), async (c) => {
  const salon = await getOwnedSalon(c)
  const b = await ownedBooking(salon.id, parseId(c.req.param('id')))
  if (b.status !== 'confirmed') throw badRequest('invalid_status', 'Seul un rendez-vous confirmé peut être annulé.')
  await db.update(bookings).set({ status: 'cancelled_by_salon', cancelReason: c.req.valid('json').reason }).where(eq(bookings.id, b.id))
  const booking = (await loadBooking(b.id))!
  sendMailSafe(cancelledBySalonMail(booking))
  return c.json({ booking })
})

for (const [path, status] of [['complete', 'completed'], ['no-show', 'no_show']] as const) {
  proRoutes.post(`/bookings/:id/${path}`, async (c) => {
    const salon = await getOwnedSalon(c)
    const b = await ownedBooking(salon.id, parseId(c.req.param('id')))
    if (b.status !== 'confirmed') throw badRequest('invalid_status', 'Ce rendez-vous a déjà été traité.')
    if (b.startsAt.getTime() > Date.now()) throw badRequest('too_early', "Ce rendez-vous n'a pas encore commencé.")
    await db.update(bookings).set({ status }).where(eq(bookings.id, b.id))
    return c.json({ booking: (await loadBooking(b.id))! })
  })
}

/* ---------- Statistiques ---------- */

/** Minuit local (Europe/Paris) du jour YYYY-MM-DD, en instant UTC (heure d'ete comprise). */
function localMidnight(ymd: string): Date {
  return new Date(zonedTimeToUtc(ymd, 0))
}

proRoutes.get('/stats', async (c) => {
  const salon = await getOwnedSalon(c)
  const now = new Date()
  const todayYmd = toLocalDate(now)
  const today = localMidnight(todayYmd)
  const tomorrow = localMidnight(addDaysYmd(todayYmd, 1))
  const weekday = new Date(`${todayYmd}T12:00:00Z`).getUTCDay() // 0 = dimanche
  const mondayYmd = addDaysYmd(todayYmd, -((weekday + 6) % 7))
  const monday = localMidnight(mondayYmd)
  const nextMonday = localMidnight(addDaysYmd(mondayYmd, 7))
  const cancelled = ['cancelled_by_client', 'cancelled_by_salon'] as const

  const [todayList, week, upcoming] = await Promise.all([
    loadBookings(and(eq(bookings.salonId, salon.id), gte(bookings.startsAt, today), lt(bookings.startsAt, tomorrow), notInArray(bookings.status, [...cancelled]))),
    db.select({ status: bookings.status, total: bookings.totalPriceEur }).from(bookings)
      .where(and(eq(bookings.salonId, salon.id), gte(bookings.startsAt, monday), lt(bookings.startsAt, nextMonday), notInArray(bookings.status, [...cancelled]))),
    loadBookings(and(eq(bookings.salonId, salon.id), eq(bookings.status, 'confirmed'), gte(bookings.startsAt, now)), { limit: 5 }),
  ])
  const stats: ProStatsDto = {
    todayCount: todayList.length,
    weekCount: week.length,
    weekRevenueEur: week.filter((b) => b.status === 'confirmed' || b.status === 'completed').reduce((s, b) => s + b.total, 0),
    upcoming,
    today: todayList,
    salonStatus: salon.status,
  }
  return c.json(stats)
})

