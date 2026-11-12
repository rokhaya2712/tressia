import { sql } from 'drizzle-orm'
import { boolean, date, doublePrecision, index, integer, pgTable, serial, smallint, text, time, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' })

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  role: text('role', { enum: ['client', 'owner', 'admin'] }).notNull().default('client'),
  createdAt: ts('created_at').notNull().defaultNow(),
})

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(), // sha256(token) en hex
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: ts('expires_at').notNull(),
})

export const salons = pgTable('salons', {
  id: serial('id').primaryKey(),
  ownerId: integer('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  phone: text('phone'),
  whatsapp: text('whatsapp'),
  address: text('address').notNull(),
  city: text('city').notNull(),
  neighborhood: text('neighborhood').notNull(),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  audience: text('audience', { enum: ['femmes', 'hommes', 'mixte'] }).notNull().default('mixte'),
  status: text('status', { enum: ['pending', 'published', 'suspended'] }).notNull().default('pending'),
  coverUrl: text('cover_url'),
  // Mode de travail de la tresseuse et zone de deplacement
  serviceMode: text('service_mode', { enum: ['chez_moi', 'domicile', 'les_deux'] }).notNull().default('chez_moi'),
  travelFeeEur: integer('travel_fee_eur').notNull().default(0),
  travelZone: text('travel_zone').array().notNull().default(sql`'{}'::text[]`),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [index('salons_owner_idx').on(t.ownerId), index('salons_status_city_idx').on(t.status, t.city)])

export const openingHours = pgTable('opening_hours', {
  id: serial('id').primaryKey(),
  salonId: integer('salon_id').notNull().references(() => salons.id, { onDelete: 'cascade' }),
  weekday: smallint('weekday').notNull(), // 0 = dimanche
  opensAt: time('opens_at').notNull(),
  closesAt: time('closes_at').notNull(),
}, (t) => [index('opening_hours_salon_idx').on(t.salonId)])

export const closures = pgTable('closures', {
  id: serial('id').primaryKey(),
  salonId: integer('salon_id').notNull().references(() => salons.id, { onDelete: 'cascade' }),
  startsOn: date('starts_on').notNull(),
  endsOn: date('ends_on').notNull(),
  reason: text('reason'),
})

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  label: text('label').notNull(),
  position: integer('position').notNull().default(0),
})

export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  salonId: integer('salon_id').notNull().references(() => salons.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  name: text('name').notNull(),
  description: text('description'),
  priceEur: integer('price_eur').notNull(),
  durationMin: integer('duration_min').notNull(),
  imageUrl: text('image_url'),
  active: boolean('active').notNull().default(true),
  position: integer('position').notNull().default(0),
}, (t) => [index('services_salon_idx').on(t.salonId)])

export const staff = pgTable('staff', {
  id: serial('id').primaryKey(),
  salonId: integer('salon_id').notNull().references(() => salons.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  photoUrl: text('photo_url'),
  bio: text('bio'),
  active: boolean('active').notNull().default(true),
  position: integer('position').notNull().default(0),
}, (t) => [index('staff_salon_idx').on(t.salonId)])

export const staffTimeOff = pgTable('staff_time_off', {
  id: serial('id').primaryKey(),
  staffId: integer('staff_id').notNull().references(() => staff.id, { onDelete: 'cascade' }),
  startsAt: ts('starts_at').notNull(),
  endsAt: ts('ends_at').notNull(),
  reason: text('reason'),
})

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  salonId: integer('salon_id').notNull().references(() => salons.id, { onDelete: 'cascade' }),
  clientId: integer('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  staffId: integer('staff_id').notNull().references(() => staff.id),
  startsAt: ts('starts_at').notNull(),
  endsAt: ts('ends_at').notNull(),
  status: text('status', { enum: ['confirmed', 'completed', 'no_show', 'cancelled_by_client', 'cancelled_by_salon'] }).notNull().default('confirmed'),
  totalPriceEur: integer('total_price_eur').notNull(),
  location: text('location', { enum: ['chez_tresseuse', 'domicile'] }).notNull().default('chez_tresseuse'),
  clientAddress: text('client_address'),
  clientCity: text('client_city'),
  travelFeeEur: integer('travel_fee_eur').notNull().default(0),
  clientNote: text('client_note'),
  cancelReason: text('cancel_reason'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [index('bookings_salon_start_idx').on(t.salonId, t.startsAt), index('bookings_client_idx').on(t.clientId), index('bookings_staff_start_idx').on(t.staffId, t.startsAt)])
// La contrainte d'exclusion anti-double-reservation est ajoutee dans une migration SQL personnalisee :
// ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap EXCLUDE USING gist (staff_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status = 'confirmed');

export const bookingItems = pgTable('booking_items', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  serviceId: integer('service_id').references(() => services.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  priceEur: integer('price_eur').notNull(),
  durationMin: integer('duration_min').notNull(),
})

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  salonId: integer('salon_id').notNull().references(() => salons.id, { onDelete: 'cascade' }),
  clientId: integer('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: smallint('rating').notNull(),
  comment: text('comment'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [uniqueIndex('reviews_booking_uq').on(t.bookingId), index('reviews_salon_idx').on(t.salonId)])

export const salonPhotos = pgTable('salon_photos', {
  id: serial('id').primaryKey(),
  salonId: integer('salon_id').notNull().references(() => salons.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  position: integer('position').notNull().default(0),
})

export { sql }
