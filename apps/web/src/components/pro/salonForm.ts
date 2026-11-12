import type { Audience, OpeningHourDto, SalonDetailDto, SalonInfoInput, ServiceMode } from '@tressia/shared'
import { acceptsHome } from '@tressia/shared'

export interface SalonForm {
  name: string; description: string; audience: Audience; phone: string; whatsapp: string
  address: string; city: string; neighborhood: string; lat: number | null; lng: number | null; coverUrl: string | null
  serviceMode: ServiceMode; travelFeeEur: number; travelZone: string[]
}
export const emptySalonForm = (): SalonForm => ({
  name: '', description: '', audience: 'mixte', phone: '', whatsapp: '', address: '', city: 'Mulhouse', neighborhood: '', lat: null, lng: null, coverUrl: null,
  serviceMode: 'chez_moi', travelFeeEur: 10, travelZone: ['Mulhouse'],
})
export const salonToForm = (s: SalonDetailDto): SalonForm => ({
  name: s.name, description: s.description ?? '', audience: s.audience, phone: s.phone ?? '', whatsapp: s.whatsapp ?? '',
  address: s.address ?? '', city: s.city, neighborhood: s.neighborhood, lat: s.lat, lng: s.lng, coverUrl: s.coverUrl,
  serviceMode: s.serviceMode, travelFeeEur: s.travelFeeEur, travelZone: [...s.travelZone],
})
export const formToInput = (f: SalonForm): SalonInfoInput => ({
  name: f.name.trim(), description: f.description.trim() || null, audience: f.audience, phone: f.phone.trim() || null, whatsapp: f.whatsapp.trim() || null,
  address: f.address.trim(), city: f.city, neighborhood: f.neighborhood, lat: f.lat, lng: f.lng, coverUrl: f.coverUrl,
  serviceMode: f.serviceMode,
  travelFeeEur: acceptsHome(f.serviceMode) ? Math.round(f.travelFeeEur || 0) : 0,
  travelZone: acceptsHome(f.serviceMode) ? f.travelZone : [],
})
export function validateInfo(f: SalonForm): Record<string, string> {
  const e: Record<string, string> = {}
  if (f.name.trim().length < 2) e.name = 'Nom affiché requis'
  return e
}
export function validateAddress(f: SalonForm): Record<string, string> {
  const e: Record<string, string> = {}
  if (f.address.trim().length < 3) e.address = 'Adresse requise'
  if (!f.city) e.city = 'Ville requise'
  if (!f.neighborhood) e.neighborhood = 'Quartier requis'
  if (acceptsHome(f.serviceMode)) {
    if (!f.travelZone.length) e.travelZone = 'Choisissez au moins une commune'
    if (f.travelFeeEur < 0 || f.travelFeeEur > 50) e.travelFeeEur = 'Entre 0 et 50 €'
  }
  return e
}

/** Horaires groupes par jour, lundi en premier. */
export interface DayHours { weekday: number; ranges: { opensAt: string; closesAt: string }[] }
export const WEEKDAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const ORDER = [1, 2, 3, 4, 5, 6, 0]
export function groupHours(hours: OpeningHourDto[]): DayHours[] {
  return ORDER.map((wd) => ({
    weekday: wd,
    ranges: hours.filter((h) => h.weekday === wd).sort((a, b) => a.opensAt.localeCompare(b.opensAt)).map((h) => ({ opensAt: h.opensAt.slice(0, 5), closesAt: h.closesAt.slice(0, 5) })),
  }))
}
export const flattenHours = (days: DayHours[]): OpeningHourDto[] => days.flatMap((d) => d.ranges.map((r) => ({ weekday: d.weekday, ...r })))
export const defaultHours = (): DayHours[] => ORDER.map((wd) => ({ weekday: wd, ranges: wd === 0 ? [] : [{ opensAt: '08:00', closesAt: '19:00' }] }))
export function validateHours(days: DayHours[]): string {
  for (const d of days) {
    const rs = [...d.ranges].sort((a, b) => a.opensAt.localeCompare(b.opensAt))
    for (let i = 0; i < rs.length; i++) {
      if (!rs[i].opensAt || !rs[i].closesAt || rs[i].opensAt >= rs[i].closesAt) return `${WEEKDAYS[d.weekday]} : l'ouverture doit précéder la fermeture.`
      if (i > 0 && rs[i].opensAt < rs[i - 1].closesAt) return `${WEEKDAYS[d.weekday]} : les plages se chevauchent.`
    }
  }
  return ''
}
