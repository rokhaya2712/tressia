import { asc, desc, eq, inArray, type SQL } from 'drizzle-orm'
import { CLIENT_CANCEL_LIMIT_MIN, type BookingDto, type BookingItemDto } from '@tressia/shared'
import { db } from '../../db/client.ts'
import { bookingItems, bookings, reviews, salons, staff, users } from '../../db/schema.ts'

export interface LoadOpts { order?: 'asc' | 'desc'; limit?: number }

/** Charge des reservations completes (salon, coiffeur, client, prestations) selon un filtre SQL. */
export async function loadBookings(where: SQL | undefined, opts: LoadOpts = {}): Promise<BookingDto[]> {
  let q = db
    .select({ b: bookings, salon: salons, staffName: staff.name, client: users, reviewId: reviews.id })
    .from(bookings)
    .innerJoin(salons, eq(salons.id, bookings.salonId))
    .innerJoin(staff, eq(staff.id, bookings.staffId))
    .innerJoin(users, eq(users.id, bookings.clientId))
    .leftJoin(reviews, eq(reviews.bookingId, bookings.id))
    .where(where)
    .orderBy(opts.order === 'desc' ? desc(bookings.startsAt) : asc(bookings.startsAt), asc(bookings.id))
    .$dynamic()
  if (opts.limit) q = q.limit(opts.limit)
  const rows = await q
  if (!rows.length) return []

  const ids = rows.map((r) => r.b.id)
  const items = await db.select().from(bookingItems).where(inArray(bookingItems.bookingId, ids)).orderBy(asc(bookingItems.id))
  const byBooking = new Map<number, BookingItemDto[]>()
  for (const it of items) {
    const list = byBooking.get(it.bookingId) ?? []
    list.push({ serviceId: it.serviceId ?? 0, name: it.name, priceEur: it.priceEur, durationMin: it.durationMin })
    byBooking.set(it.bookingId, list)
  }

  const now = Date.now()
  return rows.map(({ b, salon, staffName, client, reviewId }) => ({
    id: b.id,
    salon: { id: salon.id, slug: salon.slug, name: salon.name, address: salon.address, city: salon.city, neighborhood: salon.neighborhood, whatsapp: salon.whatsapp, coverUrl: salon.coverUrl },
    staff: { id: b.staffId, name: staffName },
    client: { id: client.id, fullName: client.fullName, phone: client.phone, email: client.email },
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt.toISOString(),
    status: b.status,
    totalPriceEur: b.totalPriceEur,
    location: b.location,
    clientAddress: b.clientAddress,
    clientCity: b.clientCity,
    travelFeeEur: b.travelFeeEur,
    clientNote: b.clientNote,
    cancelReason: b.cancelReason,
    items: byBooking.get(b.id) ?? [],
    canCancel: b.status === 'confirmed' && b.startsAt.getTime() - now > CLIENT_CANCEL_LIMIT_MIN * 60_000,
    canReview: b.status === 'completed' && reviewId == null,
    createdAt: b.createdAt.toISOString(),
  }))
}

export async function loadBooking(id: number): Promise<BookingDto | null> {
  const [b] = await loadBookings(eq(bookings.id, id))
  return b ?? null
}

/** E-mail du proprietaire d'un salon. */
export async function ownerEmailOf(salonId: number): Promise<string | null> {
  const [row] = await db.select({ email: users.email }).from(salons).innerJoin(users, eq(users.id, salons.ownerId)).where(eq(salons.id, salonId)).limit(1)
  return row?.email ?? null
}
