import { and, eq, gt, gte, inArray, lt, lte } from 'drizzle-orm'
import { addDaysYmd, MAX_HORIZON_DAYS, MIN_LEAD_MIN, SLOT_STEP_MIN, toLocalDate, zonedTimeToUtc } from '@tressia/shared'
import type { AvailabilityDto, StaffTodayDto } from '@tressia/shared'
import { db, type Db, type Tx } from '../../db/client.ts'
import { bookings, closures, openingHours, services, staff, staffTimeOff } from '../../db/schema.ts'
import { badRequest } from '../../lib/http.ts'

const MIN = 60_000
const DAY = 86_400_000
const STAFF_TODAY_MIN_FREE = 30

export interface Interval { start: Date; end: Date }
export interface LocalRange { opensAt: string; closesAt: string } // "HH:MM" ou "HH:MM:SS", heure locale
export interface SlotInput {
  date: string // YYYY-MM-DD (heure locale Europe/Paris)
  durationMin: number
  now: Date
  hours: LocalRange[] // plages d'ouverture du jour (plusieurs possibles)
  closed?: boolean // fermeture exceptionnelle couvrant la date
  staff: { staffId: number; busy: Interval[] }[] // reservations confirmees + conges
}
export interface Slot { startsAt: string; staffIds: number[] }

type Executor = Db | Tx

/** Minuit local (Europe/Paris) de la date, en UTC. Tient compte de l'heure d'ete. */
export function localMidnightUtc(date: string): number {
  return zonedTimeToUtc(date, 0)
}
/** Debut et fin (exclue) de la journee locale, en instants UTC : 23 h, 24 h ou 25 h selon la date. */
export function localDayBounds(date: string): { start: Date; end: Date } {
  return { start: new Date(localMidnightUtc(date)), end: new Date(localMidnightUtc(addDaysYmd(date, 1))) }
}
/** Date locale YYYY-MM-DD d'un instant. */
export function localDateOf(instant: Date): string {
  return toLocalDate(instant)
}
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay()
}
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h! * 60 + m!
}
/** Plages d'ouverture du jour converties en intervalles UTC. */
export function openingIntervals(date: string, hours: LocalRange[]): Interval[] {
  return hours
    .map((h) => ({ start: new Date(zonedTimeToUtc(date, toMinutes(h.opensAt))), end: new Date(zonedTimeToUtc(date, toMinutes(h.closesAt))) }))
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
}
const overlaps = (s: number, e: number, busy: Interval[]) => busy.some((b) => b.start.getTime() < e && b.end.getTime() > s)

/** Fonction pure : creneaux de debut possibles pour une duree donnee. */
export function computeSlots(input: SlotInput): Slot[] {
  if (input.closed || input.durationMin <= 0) return []
  const dur = input.durationMin * MIN
  const step = SLOT_STEP_MIN * MIN
  const minStart = input.now.getTime() + MIN_LEAD_MIN * MIN
  const maxStart = input.now.getTime() + MAX_HORIZON_DAYS * DAY
  const base = localMidnightUtc(input.date)
  const slots: Slot[] = []
  for (const range of openingIntervals(input.date, input.hours)) {
    const open = range.start.getTime()
    const close = range.end.getTime()
    let t = base + Math.ceil((open - base) / step) * step
    for (; t + dur <= close; t += step) {
      if (t < minStart || t > maxStart) continue
      const staffIds = input.staff.filter((s) => !overlaps(t, t + dur, s.busy)).map((s) => s.staffId).sort((a, b) => a - b)
      if (staffIds.length) slots.push({ startsAt: new Date(t).toISOString(), staffIds })
    }
  }
  return slots
}

export interface DayContext { hours: LocalRange[]; closed: boolean; staff: { staffId: number; name: string; photoUrl: string | null; busy: Interval[] }[] }

/** Charge horaires, fermetures, coiffeurs actifs, conges et reservations confirmees d'une journee. */
export async function loadDayContext(ex: Executor, salonId: number, date: string, staffId?: number | null): Promise<DayContext> {
  const { start: dayStart, end: dayEnd } = localDayBounds(date)
  const [hours, closedRows, staffRows] = await Promise.all([
    ex.select({ opensAt: openingHours.opensAt, closesAt: openingHours.closesAt }).from(openingHours)
      .where(and(eq(openingHours.salonId, salonId), eq(openingHours.weekday, weekdayOf(date)))),
    ex.select({ id: closures.id }).from(closures)
      .where(and(eq(closures.salonId, salonId), lte(closures.startsOn, date), gte(closures.endsOn, date))).limit(1),
    ex.select({ id: staff.id, name: staff.name, photoUrl: staff.photoUrl }).from(staff)
      .where(and(eq(staff.salonId, salonId), eq(staff.active, true), staffId ? eq(staff.id, staffId) : undefined))
      .orderBy(staff.position, staff.id),
  ])
  const ids = staffRows.map((s) => s.id)
  const busy = new Map<number, Interval[]>(ids.map((id) => [id, []]))
  if (ids.length) {
    const [offs, books] = await Promise.all([
      ex.select({ staffId: staffTimeOff.staffId, start: staffTimeOff.startsAt, end: staffTimeOff.endsAt }).from(staffTimeOff)
        .where(and(inArray(staffTimeOff.staffId, ids), lt(staffTimeOff.startsAt, dayEnd), gt(staffTimeOff.endsAt, dayStart))),
      ex.select({ staffId: bookings.staffId, start: bookings.startsAt, end: bookings.endsAt }).from(bookings)
        .where(and(inArray(bookings.staffId, ids), eq(bookings.status, 'confirmed'), lt(bookings.startsAt, dayEnd), gt(bookings.endsAt, dayStart))),
    ])
    for (const r of [...offs, ...books]) busy.get(r.staffId)?.push({ start: r.start, end: r.end })
  }
  return {
    hours,
    closed: closedRows.length > 0,
    staff: staffRows.map((s) => ({ staffId: s.id, name: s.name, photoUrl: s.photoUrl, busy: busy.get(s.id) ?? [] })),
  }
}

/** Duree totale des prestations (actives, du salon). Erreur 400 sinon. */
export async function totalDuration(ex: Executor, salonId: number, serviceIds: number[]): Promise<number> {
  const unique = [...new Set(serviceIds)]
  if (!unique.length) throw badRequest('invalid_services', 'Choisissez au moins une prestation')
  const rows = await ex.select({ durationMin: services.durationMin }).from(services)
    .where(and(eq(services.salonId, salonId), eq(services.active, true), inArray(services.id, unique)))
  if (rows.length !== unique.length) throw badRequest('invalid_services', 'Prestation inconnue ou indisponible')
  return rows.reduce((sum, r) => sum + r.durationMin, 0)
}

export async function getAvailability(salonId: number, date: string, serviceIds: number[], staffId?: number): Promise<AvailabilityDto> {
  const durationMin = await totalDuration(db, salonId, serviceIds)
  const ctx = await loadDayContext(db, salonId, date, staffId)
  const slots = computeSlots({ date, durationMin, now: new Date(), hours: ctx.hours, closed: ctx.closed, staff: ctx.staff })
  return { date, durationMin, slots }
}

/** Creneaux libres pour une duree donnee (sans charger les services). Utilise par la recherche par date. */
export async function slotsForDuration(salonId: number, date: string, durationMin: number): Promise<Slot[]> {
  const ctx = await loadDayContext(db, salonId, date)
  return computeSlots({ date, durationMin, now: new Date(), hours: ctx.hours, closed: ctx.closed, staff: ctx.staff })
}

/**
 * Coiffeur libre pour exactement ce creneau (a appeler dans la transaction de reservation).
 * staffId null = sans preference : le moins charge ce jour-la, puis le plus petit id.
 */
export async function pickFreeStaff(tx: Tx, salonId: number, startsAt: Date, durationMin: number, staffId: number | null): Promise<number | null> {
  const date = localDateOf(startsAt)
  const ctx = await loadDayContext(tx, salonId, date, staffId)
  const slots = computeSlots({ date, durationMin, now: new Date(), hours: ctx.hours, closed: ctx.closed, staff: ctx.staff })
  const slot = slots.find((s) => new Date(s.startsAt).getTime() === startsAt.getTime())
  if (!slot) return null
  if (staffId != null) return slot.staffIds.includes(staffId) ? staffId : null
  if (slot.staffIds.length === 1) return slot.staffIds[0]!
  const { start: dayStart, end: dayEnd } = localDayBounds(date)
  const rows = await tx.select({ staffId: bookings.staffId }).from(bookings)
    .where(and(inArray(bookings.staffId, slot.staffIds), eq(bookings.status, 'confirmed'), gte(bookings.startsAt, dayStart), lt(bookings.startsAt, dayEnd)))
  const counts = new Map<number, number>()
  for (const r of rows) counts.set(r.staffId, (counts.get(r.staffId) ?? 0) + 1)
  return [...slot.staffIds].sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0) || a - b)[0] ?? null
}

/** Intervalles libres (ouverture moins occupations), bornes a partir de `from`. */
export function freeSegments(open: Interval[], busy: Interval[], from: Date): Interval[] {
  const sorted = [...busy].sort((a, b) => a.start.getTime() - b.start.getTime())
  const out: Interval[] = []
  for (const o of open) {
    let cursor = Math.max(o.start.getTime(), from.getTime())
    const end = o.end.getTime()
    for (const b of sorted) {
      if (b.end.getTime() <= cursor || b.start.getTime() >= end) continue
      if (b.start.getTime() > cursor) out.push({ start: new Date(cursor), end: new Date(b.start.getTime()) })
      cursor = Math.max(cursor, b.end.getTime())
    }
    if (cursor < end) out.push({ start: new Date(cursor), end: new Date(end) })
  }
  return out
}

export function staffTodayFrom(ctx: DayContext, date: string, now: Date): StaffTodayDto[] {
  const open = ctx.closed ? [] : openingIntervals(date, ctx.hours)
  return ctx.staff.map((s) => {
    const segs = freeSegments(open, s.busy, now).filter((g) => g.end.getTime() - g.start.getTime() >= STAFF_TODAY_MIN_FREE * MIN)
    const first = segs[0]
    if (!first) return { staffId: s.staffId, name: s.name, photoUrl: s.photoUrl, freeUntil: null, nextFreeAt: null, fullToday: true }
    const freeNow = first.start.getTime() <= now.getTime()
    return {
      staffId: s.staffId,
      name: s.name,
      photoUrl: s.photoUrl,
      freeUntil: freeNow ? first.end.toISOString() : null,
      nextFreeAt: freeNow ? null : first.start.toISOString(),
      fullToday: false,
    }
  })
}

export async function getStaffToday(salonId: number, now: Date = new Date()): Promise<StaffTodayDto[]> {
  const date = localDateOf(now)
  const ctx = await loadDayContext(db, salonId, date)
  return staffTodayFrom(ctx, date, now)
}
