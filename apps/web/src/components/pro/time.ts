import { addDaysYmd, localMinutesOf, TIMEZONE, toLocalDate, zonedTimeToUtc } from '@tressia/shared'

/** Utilitaires de dates pour le fuseau de Paris (heure d'ete et d'hiver geres). */
export const today = () => toLocalDate(new Date())
export const addDays = addDaysYmd
/** Debut de journee locale, en ISO UTC. */
export const dayStart = (ymd: string) => new Date(zonedTimeToUtc(ymd, 0)).toISOString()
/** Lundi de la semaine contenant ymd. */
export function weekStart(ymd: string): string {
  const wd = new Date(`${ymd}T12:00:00Z`).getUTCDay()
  return addDays(ymd, wd === 0 ? -6 : 1 - wd)
}
/** Minutes depuis minuit (heure locale) pour un instant ISO. */
export function localMinutes(iso: string): number {
  return localMinutesOf(iso)
}
/** "2026-11-12T09:30" (datetime-local, heure de Paris) -> ISO UTC */
export function localInputToIso(v: string): string {
  const [date, time = '00:00'] = v.split('T') as [string, string?]
  const [h, m] = time.split(':').map(Number) as [number, number]
  return new Date(zonedTimeToUtc(date, h * 60 + m)).toISOString()
}
export const isPast = (iso: string) => new Date(iso).getTime() <= Date.now()
export function formatDayShort(ymd: string): string {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${ymd}T12:00:00Z`))
}
export function formatDate(ymdOrIso: string): string {
  const d = ymdOrIso.length === 10 ? new Date(`${ymdOrIso}T12:00:00Z`) : new Date(ymdOrIso)
  return new Intl.DateTimeFormat('fr-FR', { timeZone: ymdOrIso.length === 10 ? 'UTC' : TIMEZONE, day: 'numeric', month: 'short', year: 'numeric' }).format(d)
}
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: TIMEZONE, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}
export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Une erreur est survenue'
}
