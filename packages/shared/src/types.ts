import type { Audience, BookingLocation, BookingStatus, Role, SalonStatus, ServiceMode } from './constants.ts'

/** Contrat JSON entre apps/api et apps/web. Dates = chaines ISO 8601, heures = "HH:MM". */

export interface ApiErrorBody { error: { code: string; message: string; fields?: Record<string, string> } }

export interface UserDto { id: number; email: string; fullName: string; phone: string | null; role: Role }

export interface CategoryDto { id: number; slug: string; label: string }

export interface SalonCardDto {
  id: number
  slug: string
  name: string
  city: string
  neighborhood: string
  audience: Audience
  coverUrl: string | null
  rating: number | null // moyenne arrondie a 0.1
  reviewCount: number
  minPriceEur: number | null
  categories: string[] // slugs
  distanceKm: number | null // si lat/lng fournis
  lat: number | null
  lng: number | null
  serviceMode: ServiceMode
  travelFeeEur: number
  travelZone: string[] // communes ou elle se deplace
}

export interface SalonSearchResultDto { items: SalonCardDto[]; total: number; page: number; pageSize: number }

export interface OpeningHourDto { weekday: number; opensAt: string; closesAt: string } // weekday 0 = dimanche

export interface ServiceDto {
  id: number
  categoryId: number
  categorySlug: string
  name: string
  description: string | null
  priceEur: number
  durationMin: number
  imageUrl: string | null
  active: boolean
  position: number
}

export interface StaffDto { id: number; name: string; photoUrl: string | null; bio: string | null; active: boolean; position: number }

export interface PhotoDto { id: number; url: string; position: number }

export interface SalonDetailDto extends SalonCardDto {
  description: string | null
  phone: string | null
  whatsapp: string | null
  /** Adresse exacte : visible par la tresseuse elle-meme, jamais sur la fiche publique. */
  address: string | null
  status: SalonStatus
  hours: OpeningHourDto[]
  services: ServiceDto[] // actives seulement cote public
  staff: StaffDto[] // actifs seulement cote public
  photos: PhotoDto[]
}

export interface ReviewDto { id: number; rating: number; comment: string | null; authorName: string; createdAt: string }

/** GET /salons/:slug/staff-today */
export interface StaffTodayDto { staffId: number; name: string; photoUrl: string | null; freeUntil: string | null; nextFreeAt: string | null; fullToday: boolean }

/** GET /salons/:slug/availability */
export interface AvailabilityDto { date: string; durationMin: number; slots: { startsAt: string; staffIds: number[] }[] }

export interface BookingItemDto { serviceId: number; name: string; priceEur: number; durationMin: number }

export interface BookingDto {
  id: number
  salon: { id: number; slug: string; name: string; address: string; city: string; neighborhood: string; whatsapp: string | null; coverUrl: string | null }
  staff: { id: number; name: string }
  client: { id: number; fullName: string; phone: string | null; email: string }
  startsAt: string
  endsAt: string
  status: BookingStatus
  totalPriceEur: number // prestations + frais de deplacement
  location: BookingLocation
  clientAddress: string | null // si a domicile
  clientCity: string | null
  travelFeeEur: number
  clientNote: string | null
  cancelReason: string | null
  items: BookingItemDto[]
  canCancel: boolean // client: confirme et > 2 h avant
  canReview: boolean // client: honore et pas encore d'avis
  createdAt: string
}

export interface ClosureDto { id: number; startsOn: string; endsOn: string; reason: string | null }
export interface TimeOffDto { id: number; staffId: number; startsAt: string; endsAt: string; reason: string | null }

export interface ProStatsDto { todayCount: number; weekCount: number; weekRevenueEur: number; upcoming: BookingDto[]; today: BookingDto[]; salonStatus: SalonStatus }

export interface AdminSalonDto { id: number; slug: string; name: string; city: string; neighborhood: string; status: SalonStatus; ownerEmail: string; ownerName: string; createdAt: string; serviceCount: number; bookingCount: number }
