import { randomBytes, createHash } from 'node:crypto'
import { CATEGORIES, type Role } from '@tressia/shared'
import { createApp } from '../src/app.ts'
import { db, sqlClient } from '../src/db/client.ts'
import { categories, openingHours, salons, services, sessions, staff, users } from '../src/db/schema.ts'
import { hashPassword, SESSION_COOKIE, toUserDto } from '../src/lib/auth.ts'

export const app = createApp()
export { db }

const TABLES = ['reviews', 'booking_items', 'bookings', 'staff_time_off', 'staff', 'services', 'salon_photos', 'closures', 'opening_hours', 'salons', 'sessions', 'users', 'categories']

export async function resetDb() {
  await sqlClient.unsafe(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`)
  await db.insert(categories).values(CATEGORIES.map((c, i) => ({ slug: c.slug, label: c.label, position: i })))
}

let counter = 0
let cachedHash: string | null = null
export const TEST_PASSWORD = 'motdepasse123'

/** Cree un utilisateur et une session valide. `cookie` s'utilise tel quel dans l'en-tete Cookie. */
export async function createUser(role: Role = 'client', overrides: Partial<typeof users.$inferInsert> = {}) {
  counter += 1
  cachedHash ??= await hashPassword(TEST_PASSWORD)
  const [row] = await db.insert(users).values({
    email: `${role}${counter}-${Date.now()}@test.fr`,
    passwordHash: cachedHash,
    fullName: `Test ${role} ${counter}`,
    phone: '+33 6 12 34 56 78',
    role,
    ...overrides,
  }).returning()
  const token = randomBytes(32).toString('base64url')
  await db.insert(sessions).values({ id: createHash('sha256').update(token).digest('hex'), userId: row!.id, expiresAt: new Date(Date.now() + 86400_000) })
  return { user: toUserDto(row!), cookie: `${SESSION_COOKIE}=${token}` }
}

export interface SalonFixtureOpts { slug?: string; name?: string; status?: 'pending' | 'published' | 'suspended'; city?: string; neighborhood?: string; audience?: 'femmes' | 'hommes' | 'mixte'; lat?: number; lng?: number; serviceMode?: 'chez_moi' | 'domicile' | 'les_deux'; travelFeeEur?: number; travelZone?: string[] }

/** Salon publie, ouvert lun-sam 08:00-12:00 et 13:00-19:00, 2 coiffeurs, 3 coiffures (knotless 120 min, nattes homme 30 min, nattes enfant 45 min). */
export async function createSalonFixture(ownerId: number, opts: SalonFixtureOpts = {}) {
  counter += 1
  const [salon] = await db.insert(salons).values({
    ownerId,
    slug: opts.slug ?? `salon-test-${counter}`,
    name: opts.name ?? `Salon Test ${counter}`,
    description: 'Salon de test',
    phone: '+33 6 12 34 56 79',
    whatsapp: '+33 6 12 34 56 79',
    address: 'Rue 123',
    city: opts.city ?? 'Mulhouse',
    neighborhood: opts.neighborhood ?? 'Centre-ville',
    lat: opts.lat ?? 47.7466,
    lng: opts.lng ?? 7.3384,
    audience: opts.audience ?? 'mixte',
    status: opts.status ?? 'published',
    serviceMode: opts.serviceMode ?? 'chez_moi',
    travelFeeEur: opts.travelFeeEur ?? 0,
    travelZone: opts.travelZone ?? [],
  }).returning()
  const s = salon!
  const hours = []
  for (let wd = 1; wd <= 6; wd++) {
    hours.push({ salonId: s.id, weekday: wd, opensAt: '08:00', closesAt: '12:00' }, { salonId: s.id, weekday: wd, opensAt: '13:00', closesAt: '19:00' })
  }
  await db.insert(openingHours).values(hours)
  const cats = await db.select().from(categories)
  const cat = (slug: string) => cats.find((c) => c.slug === slug)!.id
  const staffRows = await db.insert(staff).values([
    { salonId: s.id, name: 'Awa', position: 0 },
    { salonId: s.id, name: 'Karim', position: 1 },
  ]).returning()
  const serviceRows = await db.insert(services).values([
    { salonId: s.id, categoryId: cat('box-braids'), name: 'Knotless braids', priceEur: 120, durationMin: 120, position: 0 },
    { salonId: s.id, categoryId: cat('homme'), name: 'Nattes plaquées homme', priceEur: 30, durationMin: 30, position: 1 },
    { salonId: s.id, categoryId: cat('enfants'), name: 'Nattes enfant', priceEur: 50, durationMin: 45, position: 2 },
  ]).returning()
  return { salon: s, staff: staffRows, services: serviceRows }
}

/** Prochaine date locale (YYYY-MM-DD) tombant sur ce jour de semaine (0 = dimanche), au moins `minDays` jours apres aujourd'hui. */
export function nextWeekday(weekday: number, minDays = 2): string {
  const d = new Date(Date.now() + 3600_000)
  d.setUTCDate(d.getUTCDate() + minDays)
  while (d.getUTCDay() !== weekday) d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}
