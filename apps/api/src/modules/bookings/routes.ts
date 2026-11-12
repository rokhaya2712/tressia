import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, eq, inArray } from 'drizzle-orm'
import { acceptsAtHer, acceptsHome, CLIENT_CANCEL_LIMIT_MIN, createBookingSchema, reviewSchema } from '@tressia/shared'
import { db } from '../../db/client.ts'
import { bookingItems, bookings, reviews, salons, services } from '../../db/schema.ts'
import { type AppEnv, currentUser, requireAuth } from '../../lib/auth.ts'
import { ApiError, badRequest, conflict, notFound, validationHook } from '../../lib/http.ts'
import { bookingConfirmedMail, cancelledByClientMail, newBookingMail, sendMailSafe } from '../../lib/mailer.ts'
import { pickFreeStaff } from '../availability/service.ts'
import { loadBooking, loadBookings, ownerEmailOf } from './mapper.ts'

export const bookingRoutes = new Hono<AppEnv>()

const slotTaken = () => conflict('slot_taken', "Ce créneau vient d'être pris. Choisissez-en un autre.")

/** Code d'erreur Postgres, y compris quand drizzle l'enveloppe dans `cause`. */
export function pgCode(err: unknown): string | undefined {
  let e: any = err
  for (let i = 0; e && i < 4; i++) {
    if (typeof e.code === 'string') return e.code
    e = e.cause
  }
  return undefined
}

const parseId = (raw: string) => {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) throw notFound()
  return id
}

bookingRoutes.post('/bookings', requireAuth, zValidator('json', createBookingSchema, validationHook), async (c) => {
  const user = currentUser(c)
  const input = c.req.valid('json')
  const [salon] = await db.select().from(salons).where(and(eq(salons.id, input.salonId), eq(salons.status, 'published'))).limit(1)
  if (!salon) throw notFound('Tresseuse introuvable')

  // Lieu du rendez-vous : chez la tresseuse, ou a domicile dans sa zone de deplacement
  const atHome = input.location === 'domicile'
  if (atHome && !acceptsHome(salon.serviceMode)) throw badRequest('home_not_offered', 'Cette tresseuse ne se déplace pas à domicile.')
  if (!atHome && !acceptsAtHer(salon.serviceMode)) throw badRequest('home_only', 'Cette tresseuse travaille uniquement à domicile : indiquez votre adresse.')
  if (atHome && !salon.travelZone.includes(input.clientCity!)) {
    throw badRequest('out_of_zone', `${salon.name} ne se déplace pas à ${input.clientCity}.`, { clientCity: 'Commune hors de sa zone de déplacement' })
  }
  const travelFee = atHome ? salon.travelFeeEur : 0

  const serviceIds = [...new Set(input.serviceIds)]
  const svc = await db.select().from(services)
    .where(and(eq(services.salonId, salon.id), eq(services.active, true), inArray(services.id, serviceIds)))
  if (svc.length !== serviceIds.length) throw badRequest('invalid_services', "Une des prestations choisies n'est plus disponible.")
  const ordered = serviceIds.map((id) => svc.find((s) => s.id === id)!)
  const durationMin = ordered.reduce((sum, s) => sum + s.durationMin, 0)
  const total = ordered.reduce((sum, s) => sum + s.priceEur, 0) + travelFee
  const startsAt = new Date(input.startsAt)
  const endsAt = new Date(startsAt.getTime() + durationMin * 60_000)

  let bookingId: number
  try {
    bookingId = await db.transaction(async (tx) => {
      const staffId = await pickFreeStaff(tx, salon.id, startsAt, durationMin, input.staffId)
      if (staffId == null) throw slotTaken()
      const [row] = await tx.insert(bookings).values({
        salonId: salon.id, clientId: user.id, staffId, startsAt, endsAt, status: 'confirmed', totalPriceEur: total, clientNote: input.note?.trim() || null,
        location: input.location, clientAddress: atHome ? input.clientAddress! : null, clientCity: atHome ? input.clientCity! : null, travelFeeEur: travelFee,
      }).returning({ id: bookings.id })
      await tx.insert(bookingItems).values(ordered.map((s) => ({ bookingId: row!.id, serviceId: s.id, name: s.name, priceEur: s.priceEur, durationMin: s.durationMin })))
      return row!.id
    })
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (pgCode(err) === '23P01') throw slotTaken()
    throw err
  }

  const booking = (await loadBooking(bookingId))!
  void (async () => {
    sendMailSafe(bookingConfirmedMail(booking))
    const ownerEmail = await ownerEmailOf(salon.id)
    if (ownerEmail) sendMailSafe(newBookingMail(booking, ownerEmail))
  })().catch((err) => console.error('[mailer]', err))
  return c.json({ booking }, 201)
})

bookingRoutes.get('/me/bookings', requireAuth, async (c) => {
  const user = currentUser(c)
  const all = await loadBookings(eq(bookings.clientId, user.id))
  const now = Date.now()
  const upcoming = all.filter((b) => b.status === 'confirmed' && new Date(b.endsAt).getTime() >= now)
  const past = all.filter((b) => !upcoming.includes(b)).reverse()
  return c.json({ upcoming, past })
})

bookingRoutes.post('/me/bookings/:id/cancel', requireAuth, async (c) => {
  const user = currentUser(c)
  const id = parseId(c.req.param('id'))
  const [b] = await db.select().from(bookings).where(and(eq(bookings.id, id), eq(bookings.clientId, user.id))).limit(1)
  if (!b) throw notFound('Rendez-vous introuvable')
  if (b.status !== 'confirmed') throw badRequest('not_cancellable', "Ce rendez-vous ne peut plus être annulé.")
  if (b.startsAt.getTime() - Date.now() <= CLIENT_CANCEL_LIMIT_MIN * 60_000) {
    throw badRequest('too_late', "Il est trop tard pour annuler en ligne (moins de 2 heures avant). Contactez directement la tresseuse.")
  }
  await db.update(bookings).set({ status: 'cancelled_by_client' }).where(and(eq(bookings.id, id), eq(bookings.status, 'confirmed')))
  const booking = (await loadBooking(id))!
  ownerEmailOf(b.salonId).then((email) => { if (email) sendMailSafe(cancelledByClientMail(booking, email)) }).catch(() => {})
  return c.json({ booking })
})

bookingRoutes.post('/me/bookings/:id/review', requireAuth, zValidator('json', reviewSchema, validationHook), async (c) => {
  const user = currentUser(c)
  const id = parseId(c.req.param('id'))
  const input = c.req.valid('json')
  const [b] = await db.select().from(bookings).where(and(eq(bookings.id, id), eq(bookings.clientId, user.id))).limit(1)
  if (!b) throw notFound('Rendez-vous introuvable')
  if (b.status !== 'completed') throw badRequest('not_completed', 'Vous pourrez laisser un avis une fois le rendez-vous honoré.')
  const [existing] = await db.select({ id: reviews.id }).from(reviews).where(eq(reviews.bookingId, id)).limit(1)
  if (existing) throw conflict('already_reviewed', 'Vous avez déjà laissé un avis pour ce rendez-vous.')
  try {
    const [r] = await db.insert(reviews).values({ bookingId: id, salonId: b.salonId, clientId: user.id, rating: input.rating, comment: input.comment?.trim() || null }).returning()
    return c.json({ review: { id: r!.id, rating: r!.rating, comment: r!.comment, authorName: user.fullName, createdAt: r!.createdAt.toISOString() } }, 201)
  } catch (err) {
    if (pgCode(err) === '23505') throw conflict('already_reviewed', 'Vous avez déjà laissé un avis pour ce rendez-vous.')
    throw err
  }
})
