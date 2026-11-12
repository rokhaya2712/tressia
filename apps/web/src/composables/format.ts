import { addDaysYmd, toLocalDate, zonedTimeToUtc } from '@tressia/shared'

/** Petits utilitaires d'affichage propres au parcours client. */
export function waLink(num: string | null | undefined, text?: string): string | null {
  if (!num) return null
  const digits = num.replace(/\D/g, '')
  if (!digits) return null
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

export function telLink(num: string | null | undefined): string | null {
  const clean = num?.replace(/[^\d+]/g, '')
  return clean ? `tel:${clean}` : null
}

export function mapsLink(lat: number | null, lng: number | null, address?: string): string {
  if (lat != null && lng != null) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address ?? '')}`
}

/** "YYYY-MM-DD" du jour en France, avec décalage en jours. */
export function localDay(offset = 0): string {
  return addDaysYmd(toLocalDate(new Date()), offset)
}

/** Midi local d'un jour "YYYY-MM-DD" en ISO UTC, pratique pour formater sans dériver. */
export function dayToIso(day: string): string {
  return new Date(zonedTimeToUtc(day, 12 * 60)).toISOString()
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}
