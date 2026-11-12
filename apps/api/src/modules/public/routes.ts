import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm'
import { availabilityQuerySchema, PAGE_SIZE, salonSearchSchema } from '@tressia/shared'
import type { CategoryDto, ReviewDto, SalonCardDto, SalonDetailDto, SalonSearchResultDto } from '@tressia/shared'
import { db } from '../../db/client.ts'
import { categories, openingHours, reviews, salonPhotos, salons, services, staff, users } from '../../db/schema.ts'
import type { AppEnv } from '../../lib/auth.ts'
import { notFound, validationHook } from '../../lib/http.ts'
import { getAvailability, getStaffToday, slotsForDuration } from '../availability/service.ts'

export const publicRoutes = new Hono<AppEnv>()

type SalonRow = typeof salons.$inferSelect

const hhmm = (t: string) => t.slice(0, 5)

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLng = rad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Agrege note, prix mini, categories et duree mini des services actifs pour une liste de salons. */
async function salonAggregates(ids: number[]) {
  const ratings = new Map<number, { avg: number; count: number }>()
  const prices = new Map<number, { min: number; minDuration: number }>()
  const cats = new Map<number, string[]>()
  if (!ids.length) return { ratings, prices, cats }
  const [r, p, c] = await Promise.all([
    db.select({ salonId: reviews.salonId, avg: sql<string>`avg(${reviews.rating})`, count: sql<number>`count(*)::int` })
      .from(reviews).where(inArray(reviews.salonId, ids)).groupBy(reviews.salonId),
    db.select({ salonId: services.salonId, min: sql<number>`min(${services.priceEur})::int`, minDuration: sql<number>`min(${services.durationMin})::int` })
      .from(services).where(and(inArray(services.salonId, ids), eq(services.active, true))).groupBy(services.salonId),
    db.selectDistinct({ salonId: services.salonId, slug: categories.slug, position: categories.position })
      .from(services).innerJoin(categories, eq(categories.id, services.categoryId))
      .where(and(inArray(services.salonId, ids), eq(services.active, true))).orderBy(categories.position),
  ])
  for (const x of r) ratings.set(x.salonId, { avg: Math.round(Number(x.avg) * 10) / 10, count: x.count })
  for (const x of p) prices.set(x.salonId, { min: x.min, minDuration: x.minDuration })
  for (const x of c) cats.set(x.salonId, [...(cats.get(x.salonId) ?? []), x.slug])
  return { ratings, prices, cats }
}

/** Position publique arrondie a ~1 km : on ne revele jamais le domicile exact de la tresseuse. */
const blur = (v: number | null) => (v == null ? null : Math.round(v * 100) / 100)

function toCard(s: SalonRow, agg: Awaited<ReturnType<typeof salonAggregates>>, distanceKm: number | null): SalonCardDto {
  const rating = agg.ratings.get(s.id)
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    city: s.city,
    neighborhood: s.neighborhood,
    audience: s.audience,
    coverUrl: s.coverUrl,
    rating: rating ? rating.avg : null,
    reviewCount: rating?.count ?? 0,
    minPriceEur: agg.prices.get(s.id)?.min ?? null,
    categories: agg.cats.get(s.id) ?? [],
    distanceKm: distanceKm == null ? null : Math.round(distanceKm * 10) / 10,
    lat: blur(s.lat),
    lng: blur(s.lng),
    serviceMode: s.serviceMode,
    travelFeeEur: s.travelFeeEur,
    travelZone: s.travelZone,
  }
}

async function publishedSalonBySlug(slug: string) {
  const [salon] = await db.select().from(salons).where(and(eq(salons.slug, slug), eq(salons.status, 'published'))).limit(1)
  if (!salon) throw notFound('Tresseuse introuvable')
  return salon
}

publicRoutes.get('/categories', async (c) => {
  const rows = await db.select({ id: categories.id, slug: categories.slug, label: categories.label }).from(categories).orderBy(categories.position, categories.id)
  return c.json(rows satisfies CategoryDto[])
})

publicRoutes.get('/cities', async (c) => {
  const rows = await db.selectDistinct({ city: salons.city, neighborhood: salons.neighborhood }).from(salons)
    .where(eq(salons.status, 'published')).orderBy(salons.city, salons.neighborhood)
  const map = new Map<string, string[]>()
  for (const r of rows) map.set(r.city, [...(map.get(r.city) ?? []), r.neighborhood])
  return c.json([...map].map(([city, neighborhoods]) => ({ city, neighborhoods })))
})

publicRoutes.get('/salons', zValidator('query', salonSearchSchema, validationHook), async (c) => {
  const f = c.req.valid('query')
  const conds: (SQL | undefined)[] = [eq(salons.status, 'published')]
  if (f.mode === 'domicile') {
    // Celles qui se deplacent ; avec une ville, celles dont la zone couvre cette commune
    conds.push(inArray(salons.serviceMode, ['domicile', 'les_deux']))
    if (f.city) conds.push(sql`${f.city} = any(${salons.travelZone})`)
  } else {
    if (f.mode === 'chez_tresseuse') conds.push(inArray(salons.serviceMode, ['chez_moi', 'les_deux']))
    if (f.city) conds.push(eq(salons.city, f.city))
  }
  if (f.neighborhood) conds.push(eq(salons.neighborhood, f.neighborhood))
  if (f.audience) conds.push(eq(salons.audience, f.audience))
  if (f.q) {
    const like = `%${f.q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`
    conds.push(or(
      ilike(salons.name, like),
      ilike(salons.description, like),
      sql`exists (select 1 from ${services} where ${services.salonId} = ${salons.id} and ${services.active} and ${services.name} ilike ${like})`,
    ))
  }
  if (f.category) {
    conds.push(sql`exists (select 1 from ${services} inner join ${categories} on ${categories.id} = ${services.categoryId}
      where ${services.salonId} = ${salons.id} and ${services.active} and ${categories.slug} = ${f.category})`)
  }
  if (f.maxPrice) {
    conds.push(sql`exists (select 1 from ${services} where ${services.salonId} = ${salons.id} and ${services.active} and ${services.priceEur} <= ${f.maxPrice})`)
  }
  const rows = await db.select().from(salons).where(and(...conds)).orderBy(asc(salons.name))
  const agg = await salonAggregates(rows.map((s) => s.id))

  const hasGeo = f.lat != null && f.lng != null
  let list = rows.map((s) => ({ s, distance: hasGeo && s.lat != null && s.lng != null ? haversineKm(f.lat!, f.lng!, s.lat, s.lng) : null }))
  if (hasGeo && f.radiusKm) list = list.filter((x) => x.distance != null && x.distance <= f.radiusKm!)

  if (f.date) {
    const checks = await Promise.all(list.map(async (x) => {
      const minDuration = agg.prices.get(x.s.id)?.minDuration
      if (!minDuration) return false
      return (await slotsForDuration(x.s.id, f.date!, minDuration)).length > 0
    }))
    list = list.filter((_, i) => checks[i])
  }

  if (hasGeo) {
    list.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
  } else {
    list.sort((a, b) => {
      const ra = agg.ratings.get(a.s.id)
      const rb = agg.ratings.get(b.s.id)
      return (rb?.avg ?? 0) - (ra?.avg ?? 0) || (rb?.count ?? 0) - (ra?.count ?? 0) || a.s.name.localeCompare(b.s.name, 'fr')
    })
  }

  const page = f.page
  const items = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((x) => toCard(x.s, agg, x.distance))
  return c.json({ items, total: list.length, page, pageSize: PAGE_SIZE } satisfies SalonSearchResultDto)
})

publicRoutes.get('/salons/:slug', async (c) => {
  const salon = await publishedSalonBySlug(c.req.param('slug'))
  const [agg, hours, serviceRows, staffRows, photos] = await Promise.all([
    salonAggregates([salon.id]),
    db.select().from(openingHours).where(eq(openingHours.salonId, salon.id)).orderBy(openingHours.weekday, openingHours.opensAt),
    db.select({ s: services, categorySlug: categories.slug }).from(services).innerJoin(categories, eq(categories.id, services.categoryId))
      .where(and(eq(services.salonId, salon.id), eq(services.active, true))).orderBy(services.position, services.id),
    db.select().from(staff).where(and(eq(staff.salonId, salon.id), eq(staff.active, true))).orderBy(staff.position, staff.id),
    db.select().from(salonPhotos).where(eq(salonPhotos.salonId, salon.id)).orderBy(salonPhotos.position, salonPhotos.id),
  ])
  const dto: SalonDetailDto = {
    ...toCard(salon, agg, null),
    description: salon.description,
    phone: salon.phone,
    whatsapp: salon.whatsapp,
    address: null, // l'adresse exacte n'est communiquee qu'apres reservation
    status: salon.status,
    hours: hours.map((h) => ({ weekday: h.weekday, opensAt: hhmm(h.opensAt), closesAt: hhmm(h.closesAt) })),
    services: serviceRows.map(({ s, categorySlug }) => ({
      id: s.id, categoryId: s.categoryId, categorySlug, name: s.name, description: s.description, priceEur: s.priceEur,
      durationMin: s.durationMin, imageUrl: s.imageUrl, active: s.active, position: s.position,
    })),
    staff: staffRows.map((s) => ({ id: s.id, name: s.name, photoUrl: s.photoUrl, bio: s.bio, active: s.active, position: s.position })),
    photos: photos.map((p) => ({ id: p.id, url: p.url, position: p.position })),
  }
  return c.json(dto)
})

export function authorName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  const first = parts[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1]! : ''
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first
}

publicRoutes.get('/salons/:slug/reviews', async (c) => {
  const salon = await publishedSalonBySlug(c.req.param('slug'))
  const rows = await db.select({ r: reviews, fullName: users.fullName }).from(reviews).innerJoin(users, eq(users.id, reviews.clientId))
    .where(eq(reviews.salonId, salon.id)).orderBy(desc(reviews.createdAt), desc(reviews.id)).limit(100)
  const dto: ReviewDto[] = rows.map(({ r, fullName }) => ({ id: r.id, rating: r.rating, comment: r.comment, authorName: authorName(fullName), createdAt: r.createdAt.toISOString() }))
  return c.json(dto)
})

publicRoutes.get('/salons/:slug/staff-today', async (c) => {
  const salon = await publishedSalonBySlug(c.req.param('slug'))
  return c.json(await getStaffToday(salon.id))
})

publicRoutes.get('/salons/:slug/availability', zValidator('query', availabilityQuerySchema, validationHook), async (c) => {
  const salon = await publishedSalonBySlug(c.req.param('slug'))
  const q = c.req.valid('query')
  return c.json(await getAvailability(salon.id, q.date, q.serviceIds, q.staffId))
})
