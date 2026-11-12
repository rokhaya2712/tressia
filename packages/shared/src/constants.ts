// Fuseau de la France metropolitaine : UTC+1 l'hiver, UTC+2 l'ete.
// Les conversions passent par format.ts (zonedTimeToUtc, toLocalDate), jamais par un decalage fixe.
export const TIMEZONE = 'Europe/Paris'
export const SLOT_STEP_MIN = 15
export const MIN_LEAD_MIN = 60
export const MAX_HORIZON_DAYS = 60
export const CLIENT_CANCEL_LIMIT_MIN = 120
export const PAGE_SIZE = 12

export const ROLES = ['client', 'owner', 'admin'] as const
export type Role = (typeof ROLES)[number]

export const AUDIENCES = ['femmes', 'hommes', 'mixte'] as const
export type Audience = (typeof AUDIENCES)[number]
export const AUDIENCE_LABELS: Record<Audience, string> = { femmes: 'Femmes', hommes: 'Hommes', mixte: 'Mixte' }

export const SALON_STATUSES = ['pending', 'published', 'suspended'] as const
export type SalonStatus = (typeof SALON_STATUSES)[number]

export const BOOKING_STATUSES = ['confirmed', 'completed', 'no_show', 'cancelled_by_client', 'cancelled_by_salon'] as const
export type BookingStatus = (typeof BOOKING_STATUSES)[number]
export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  confirmed: 'Confirmé',
  completed: 'Honoré',
  no_show: 'Client absent',
  cancelled_by_client: 'Annulé par le client',
  cancelled_by_salon: 'Annulé par la tresseuse',
}

export const CATEGORIES = [
  { slug: 'box-braids', label: 'Box braids & knotless' },
  { slug: 'twists', label: 'Twists & vanilles' },
  { slug: 'nattes-collees', label: 'Nattes collées & cornrows' },
  { slug: 'fulani', label: 'Fulani & tribal' },
  { slug: 'crochet', label: 'Crochet braids' },
  { slug: 'locks', label: 'Locks & faux locs' },
  { slug: 'traditionnel', label: 'Coiffures traditionnelles' },
  { slug: 'homme', label: 'Tresses homme' },
  { slug: 'enfants', label: 'Enfants' },
] as const

export const CITIES: Record<string, string[]> = {
  Mulhouse: ['Centre-ville', 'Gare', 'Rebberg', 'Dornach', 'Bourtzwiller', 'Coteaux', 'Drouot', 'Fonderie', 'Doller', 'Nordfeld'],
  Colmar: ['Centre historique', 'Petite Venise', 'Saint-Joseph', 'Europe', 'Maraîchers'],
  Strasbourg: ['Grande Île', 'Krutenau', 'Neudorf', 'Gare', 'Esplanade', 'Orangerie', 'Hautepierre'],
}

/** Ou la tresseuse travaille : chez elle, au domicile de la cliente, ou les deux. */
export const SERVICE_MODES = ['chez_moi', 'domicile', 'les_deux'] as const
export type ServiceMode = (typeof SERVICE_MODES)[number]
export const SERVICE_MODE_LABELS: Record<ServiceMode, string> = {
  chez_moi: 'Reçoit chez elle',
  domicile: 'Se déplace à domicile',
  les_deux: 'Chez elle ou à domicile',
}

/** Lieu d'un rendez-vous. */
export const BOOKING_LOCATIONS = ['chez_tresseuse', 'domicile'] as const
export type BookingLocation = (typeof BOOKING_LOCATIONS)[number]
export const BOOKING_LOCATION_LABELS: Record<BookingLocation, string> = { chez_tresseuse: 'Chez la tresseuse', domicile: 'À domicile' }

export const acceptsHome = (mode: ServiceMode) => mode === 'domicile' || mode === 'les_deux'
export const acceptsAtHer = (mode: ServiceMode) => mode === 'chez_moi' || mode === 'les_deux'

/** Communes ou une tresseuse peut se deplacer, regroupees par agglomeration. */
export const TRAVEL_AREAS: Record<string, string[]> = {
  'Agglomération de Mulhouse': ['Mulhouse', 'Riedisheim', 'Illzach', 'Kingersheim', 'Wittenheim', 'Rixheim', 'Brunstatt-Didenheim', 'Pfastatt', 'Lutterbach', 'Sausheim', 'Habsheim', 'Wittelsheim'],
  'Agglomération de Colmar': ['Colmar', 'Wintzenheim', 'Ingersheim', 'Horbourg-Wihr', 'Turckheim'],
  'Eurométropole de Strasbourg': ['Strasbourg', 'Schiltigheim', 'Bischheim', 'Illkirch-Graffenstaden', 'Lingolsheim', 'Ostwald', 'Hoenheim'],
}
export const TRAVEL_COMMUNES: string[] = Object.values(TRAVEL_AREAS).flat()
export const MAX_TRAVEL_FEE_EUR = 50

/** Coordonnees publiques de la plateforme. */
export const PLATFORM = { name: 'Tressia', phone: '06 79 07 04 87', phoneIntl: '+33679070487', email: 'contact@tressia.fr' } as const
