import { z } from 'zod'
import { AUDIENCES, BOOKING_LOCATIONS, MAX_TRAVEL_FEE_EUR, ROLES, SERVICE_MODES, TRAVEL_COMMUNES } from './constants.ts'

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format HH:MM')
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format AAAA-MM-JJ')

export const registerSchema = z.object({
  email: z.email('E-mail invalide').transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8, '8 caractères minimum'),
  fullName: z.string().trim().min(2, 'Nom trop court').max(80),
  phone: z.string().trim().min(8, 'Numéro invalide').max(20),
  role: z.enum(['client', 'owner']).default('client'),
})
export const loginSchema = z.object({ email: z.email().transform((v) => v.toLowerCase().trim()), password: z.string().min(1) })

export const salonSearchSchema = z.object({
  q: z.string().trim().optional(),
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  category: z.string().optional(),
  audience: z.enum(AUDIENCES).optional(),
  maxPrice: z.coerce.number().int().positive().optional(),
  date: ymd.optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radiusKm: z.coerce.number().positive().optional(),
  /** 'domicile' : seulement celles qui se deplacent (dans `city` si fournie). */
  mode: z.enum(['domicile', 'chez_tresseuse']).optional(),
  page: z.coerce.number().int().min(1).default(1),
})

export const availabilityQuerySchema = z.object({
  date: ymd,
  serviceIds: z.string().transform((s) => s.split(',').map(Number).filter(Boolean)).pipe(z.array(z.number().int()).min(1)),
  staffId: z.coerce.number().int().optional(),
})

export const createBookingSchema = z.object({
  salonId: z.number().int(),
  serviceIds: z.array(z.number().int()).min(1),
  staffId: z.number().int().nullable(),
  startsAt: z.iso.datetime({ offset: true }),
  note: z.string().max(500).optional(),
  location: z.enum(BOOKING_LOCATIONS).default('chez_tresseuse'),
  clientAddress: z.string().trim().max(200).optional(),
  clientCity: z.string().trim().max(80).optional(),
}).superRefine((v, ctx) => {
  if (v.location !== 'domicile') return
  if (!v.clientAddress || v.clientAddress.length < 5) ctx.addIssue({ code: 'custom', path: ['clientAddress'], message: 'Indiquez votre adresse' })
  if (!v.clientCity) ctx.addIssue({ code: 'custom', path: ['clientCity'], message: 'Choisissez votre commune' })
})

export const reviewSchema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().max(1000).optional() })
export const cancelSchema = z.object({ reason: z.string().trim().min(3, 'Motif requis').max(300) })

export const salonInfoSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().max(2000).nullable().optional(),
  audience: z.enum(AUDIENCES),
  phone: z.string().max(20).nullable().optional(),
  whatsapp: z.string().max(20).nullable().optional(),
  address: z.string().trim().min(3).max(200),
  city: z.string().trim().min(2),
  neighborhood: z.string().trim().min(2),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  serviceMode: z.enum(SERVICE_MODES).default('chez_moi'),
  travelFeeEur: z.number().int().min(0).max(MAX_TRAVEL_FEE_EUR).default(0),
  travelZone: z.array(z.enum(TRAVEL_COMMUNES as [string, ...string[]])).max(40).default([]),
})

export const hoursSchema = z.object({ hours: z.array(z.object({ weekday: z.number().int().min(0).max(6), opensAt: hhmm, closesAt: hhmm })) })
export const closureSchema = z.object({ startsOn: ymd, endsOn: ymd, reason: z.string().max(200).nullable().optional() })

export const serviceSchema = z.object({
  categoryId: z.number().int(),
  name: z.string().trim().min(2).max(80),
  description: z.string().max(1000).nullable().optional(),
  priceEur: z.number().int().min(0),
  durationMin: z.number().int().min(15).max(600).multipleOf(15, 'Durée par pas de 15 min'),
  imageUrl: z.string().nullable().optional(),
  active: z.boolean().default(true),
  position: z.number().int().default(0),
})

export const staffSchema = z.object({
  name: z.string().trim().min(2).max(60),
  photoUrl: z.string().nullable().optional(),
  bio: z.string().max(300).nullable().optional(),
  active: z.boolean().default(true),
  position: z.number().int().default(0),
})
export const timeOffSchema = z.object({ startsAt: z.iso.datetime({ offset: true }), endsAt: z.iso.datetime({ offset: true }), reason: z.string().max(200).nullable().optional() })

export type RegisterInput = z.input<typeof registerSchema>
export type SalonInfoInput = z.input<typeof salonInfoSchema>
export type ServiceInput = z.input<typeof serviceSchema>
export type StaffInput = z.input<typeof staffSchema>
export const roleSchema = z.enum(ROLES)
