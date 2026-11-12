import { TIMEZONE } from './constants.ts'

/** 45 -> "45 €", 1250 -> "1 250 €" (montants entiers en euros) */
export function formatEuro(amount: number): string {
  return `${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} €`
}

/** 75 -> "1 h 15", 45 -> "45 min" */
export function formatDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

/** ISO -> "14:30" en heure de Paris */
export function formatTime(iso: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

/** ISO -> "mardi 14 novembre" */
export function formatDayLong(iso: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: TIMEZONE, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso))
}

/** Date locale (Paris) "YYYY-MM-DD" pour un instant donne */
export function toLocalDate(iso: string | Date | number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
}

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIMEZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
})

/** Decalage du fuseau (en minutes, +60 l'hiver, +120 l'ete) a un instant donne. */
export function tzOffsetMin(instant: Date | number): number {
  const ms = new Date(instant).getTime()
  const p = Object.fromEntries(partsFormatter.formatToParts(ms).map((x) => [x.type, x.value]))
  const asUtc = Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!, +p.second!)
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60_000)
}

/**
 * Instant UTC (en ms) de l'heure locale `ymd` + `minutes` depuis minuit.
 * Gere le passage a l'heure d'ete et d'hiver (journees de 23 h et de 25 h).
 */
export function zonedTimeToUtc(ymd: string, minutes = 0): number {
  const [y, m, d] = ymd.split('-').map(Number) as [number, number, number]
  const wall = Date.UTC(y, m - 1, d) + minutes * 60_000
  let t = wall - tzOffsetMin(wall) * 60_000
  const corrected = wall - tzOffsetMin(t) * 60_000
  if (corrected !== t) t = corrected
  return t
}

/** Jour calendaire suivant ou precedent : "2026-03-28" + 1 -> "2026-03-29" */
export function addDaysYmd(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Minutes ecoulees depuis minuit (heure de Paris) pour un instant. */
export function localMinutesOf(iso: string | Date | number): number {
  const p = Object.fromEntries(partsFormatter.formatToParts(new Date(iso)).map((x) => [x.type, x.value]))
  return +p.hour! * 60 + +p.minute!
}
