import { CATEGORIES, zonedTimeToUtc } from '@tressia/shared'
import { db, sqlClient } from './client.ts'
import { bookingItems, bookings, categories, closures, openingHours, reviews, salonPhotos, salons, services, staff, users } from './schema.ts'
import { hashPassword } from '../lib/auth.ts'
import { localDateOf, weekdayOf } from '../modules/availability/service.ts'
import { copySeedAssets } from '../lib/seedAssets.ts'

const DAY = 86_400_000
// Photos reelles (Wikimedia Commons, voir seed-assets/photos/CREDITS.md)
const COVERS: Record<string, string> = {
  'awa-diallo': 'braiding-01.jpg', 'fatou-ndiaye': 'braiding-02.jpg', 'mame-diarra': 'hair-braiding.jpg',
  'khady-mbaye': 'braiding-05.jpg', 'aminata-ba': 'braiding-03.jpg', 'ousmane-tresses': 'barber-07.jpg', 'coumba-sow': 'coiffeuses.jpg',
}
const GALLERY: Record<string, string[]> = {
  femmes: ['braiding-02.jpg', 'braiding-05.jpg', 'hair-braiding.jpg', 'coiffeuses.jpg', 'braiding-child.jpg', 'braiding-03.jpg'],
  hommes: ['barber-07.jpg', 'barber-01.jpg', 'braiding-03.jpg', 'barber-08.jpg'],
  mixte: ['braiding-02.jpg', 'barber-07.jpg', 'braiding-child.jpg', 'braiding-05.jpg', 'coiffeuses.jpg'],
}
const CAT_IMAGE: Record<string, string> = {
  'box-braids': 'braiding-02.jpg', twists: 'braiding-05.jpg', 'nattes-collees': 'braiding-01.jpg', fulani: 'hair-braiding.jpg',
  crochet: 'coiffeuses.jpg', locks: 'braiding-03.jpg', traditionnel: 'braiding-05.jpg', homme: 'barber-07.jpg', enfants: 'braiding-child.jpg',
}
const img = (f: string) => `/uploads/seed/${f}`

copySeedAssets()

await sqlClient.unsafe(`TRUNCATE "reviews", "booking_items", "bookings", "staff_time_off", "staff", "services", "salon_photos", "closures", "opening_hours", "salons", "sessions", "users", "categories" RESTART IDENTITY CASCADE`)

const cats = await db.insert(categories).values(CATEGORIES.map((c, i) => ({ slug: c.slug, label: c.label, position: i }))).returning()
const catId = (slug: string) => cats.find((c) => c.slug === slug)!.id

const passwordHash = await hashPassword('tressia123')
const u = (email: string, fullName: string, role: 'client' | 'owner' | 'admin', phone: string) => ({ email, fullName, role, phone, passwordHash })
const userRows = await db.insert(users).values([
  u('admin@tressia.test', 'Équipe Tressia', 'admin', '+33 6 79 07 04 87'),
  u('tresseuse@tressia.test', 'Awa Diallo', 'owner', '+33 6 12 34 56 78'),
  u('client@tressia.test', 'Aïcha Benali', 'client', '+33 6 45 78 12 90'),
  u('fatou@tressia.test', 'Fatou Ndiaye', 'owner', '+33 7 21 08 47 35'),
  u('mame@tressia.test', 'Mame Diarra Sarr', 'owner', '+33 7 33 70 18 42'),
  u('khady@tressia.test', 'Khady Mbaye', 'owner', '+33 6 48 92 05 17'),
  u('aminata@tressia.test', 'Aminata Ba', 'owner', '+33 6 80 14 63 29'),
  u('ousmane@tressia.test', 'Ousmane Diop', 'owner', '+33 7 27 55 31 64'),
  u('coumba@tressia.test', 'Coumba Sow', 'owner', '+33 6 02 41 88 53'),
  u('carine@tressia.test', 'Carine Muller', 'client', '+33 6 11 22 33 44'),
  u('ulrich@tressia.test', 'Ulrich Schmitt', 'client', '+33 6 44 55 66 77'),
  u('nadege@tressia.test', 'Nadège Traoré', 'client', '+33 7 77 88 99 10'),
  u('arnaud@tressia.test', 'Arnaud Lefèvre', 'client', '+33 6 10 20 30 40'),
  u('florence@tressia.test', 'Florence N\'Diaye', 'client', '+33 6 40 50 60 70'),
]).returning()
const userId = (email: string) => userRows.find((x) => x.email === email)!.id
const clientIds = ['client@tressia.test', 'carine@tressia.test', 'ulrich@tressia.test', 'nadege@tressia.test', 'arnaud@tressia.test', 'florence@tressia.test'].map(userId)

type Range = [string, string]
type Mode = 'chez_moi' | 'domicile' | 'les_deux'
interface SeedSalon {
  owner: string; slug: string; name: string; description: string; phone: string; address: string; city: string; neighborhood: string
  lat: number; lng: number; audience: 'femmes' | 'hommes' | 'mixte'; status: 'published' | 'pending'; cover: string
  mode: Mode; fee: number; zone: string[]
  week: Range[]; saturday?: Range[]; sunday?: Range[]
  staff: { name: string; bio: string }[]
  services: { cat: string; name: string; description?: string; price: number; duration: number }[]
}

const MULHOUSE_PROCHE = ['Mulhouse', 'Riedisheim', 'Illzach', 'Kingersheim', 'Brunstatt-Didenheim', 'Pfastatt', 'Lutterbach']

// Tarifs courants a Mulhouse et en Alsace (meches non comprises sauf mention).
const SALONS: SeedSalon[] = [
  {
    owner: 'tresseuse@tressia.test', slug: 'awa-diallo', name: 'Awa Diallo', audience: 'femmes', status: 'published', cover: 'hairGallery.jpeg',
    mode: 'les_deux', fee: 10, zone: MULHOUSE_PROCHE,
    description: 'Tresseuse sénégalaise depuis plus de dix ans. Je reçois chez moi au centre de Mulhouse ou je me déplace dans l\'agglomération. Knotless, box braids, twists et nattes collées.',
    phone: '+33 6 12 34 56 78', address: '14 rue du Sauvage', city: 'Mulhouse', neighborhood: 'Centre-ville', lat: 47.7466, lng: 7.3384,
    week: [['09:00', '19:00']], saturday: [['08:00', '19:00']],
    staff: [{ name: 'Awa', bio: 'Knotless, box braids et nattes collées.' }],
    services: [
      { cat: 'box-braids', name: 'Knotless braids moyennes', description: 'Mèches comprises, longueur mi-dos.', price: 130, duration: 300 },
      { cat: 'box-braids', name: 'Knotless braids fines', description: 'Mèches comprises.', price: 170, duration: 390 },
      { cat: 'box-braids', name: 'Box braids classiques', price: 100, duration: 270 },
      { cat: 'twists', name: 'Twists sénégalaises', price: 100, duration: 240 },
      { cat: 'nattes-collees', name: 'Nattes collées simples (sans mèches)', price: 35, duration: 60 },
      { cat: 'nattes-collees', name: 'Cornrows avec mèches', price: 60, duration: 120 },
      { cat: 'enfants', name: 'Nattes enfant avec perles', price: 30, duration: 75 },
    ],
  },
  {
    owner: 'fatou@tressia.test', slug: 'fatou-ndiaye', name: 'Fatou Ndiaye', audience: 'femmes', status: 'published', cover: 'hairGallery.jpeg',
    mode: 'domicile', fee: 15, zone: ['Mulhouse', 'Riedisheim', 'Illzach', 'Kingersheim', 'Wittenheim', 'Rixheim', 'Sausheim', 'Habsheim', 'Wittelsheim'],
    description: 'Je me déplace uniquement à domicile, avec tout le matériel. Spécialiste des fulani braids et des coiffures traditionnelles sénégalaises pour les mariages et les baptêmes.',
    phone: '+33 7 21 08 47 35', address: '9 rue de Kingersheim', city: 'Mulhouse', neighborhood: 'Bourtzwiller', lat: 47.7702, lng: 7.3268,
    week: [['10:00', '20:00']], saturday: [['08:00', '20:00']], sunday: [['10:00', '18:00']],
    staff: [{ name: 'Fatou', bio: 'Fulani, tribal et coiffures de cérémonie.' }],
    services: [
      { cat: 'fulani', name: 'Fulani braids', price: 110, duration: 270 },
      { cat: 'fulani', name: 'Tribal braids', price: 120, duration: 300 },
      { cat: 'traditionnel', name: 'Coiffure de cérémonie (mariage, baptême)', description: 'Nattes, perles et foulard. Essai possible.', price: 80, duration: 150 },
      { cat: 'traditionnel', name: 'Tresses au fil africain', price: 45, duration: 90 },
      { cat: 'twists', name: 'Vanilles', price: 70, duration: 180 },
      { cat: 'enfants', name: 'Tresses enfant (moins de 10 ans)', price: 40, duration: 120 },
    ],
  },
  {
    owner: 'mame@tressia.test', slug: 'mame-diarra', name: 'Mame Diarra', audience: 'femmes', status: 'published', cover: 'hairGallery.jpeg',
    mode: 'chez_moi', fee: 0, zone: [],
    description: 'Étudiante et tresseuse, je reçois chez moi près du campus de l\'Illberg. Prix doux pour les étudiantes, du lundi au vendredi.',
    phone: '+33 7 33 70 18 42', address: '21 rue Alfred Werner', city: 'Mulhouse', neighborhood: 'Coteaux', lat: 47.7322, lng: 7.3115,
    week: [['13:00', '20:00']], saturday: [['09:00', '19:00']],
    staff: [{ name: 'Mame Diarra', bio: 'Crochet braids, faux locs et twists.' }],
    services: [
      { cat: 'crochet', name: 'Crochet braids', price: 55, duration: 120 },
      { cat: 'locks', name: 'Faux locs', price: 110, duration: 300 },
      { cat: 'locks', name: 'Butterfly locs', price: 120, duration: 300 },
      { cat: 'twists', name: 'Passion twists', price: 90, duration: 240 },
      { cat: 'nattes-collees', name: 'Deux nattes collées', price: 25, duration: 45 },
    ],
  },
  {
    owner: 'khady@tressia.test', slug: 'khady-mbaye', name: 'Khady Mbaye', audience: 'mixte', status: 'published', cover: 'hairGallery.jpeg',
    mode: 'les_deux', fee: 12, zone: ['Colmar', 'Wintzenheim', 'Ingersheim', 'Horbourg-Wihr', 'Turckheim'],
    description: 'Tresses pour toute la famille à Colmar : femmes, hommes et enfants. Je reçois à Saint-Joseph ou je viens chez vous.',
    phone: '+33 6 48 92 05 17', address: '6 rue de Turckheim', city: 'Colmar', neighborhood: 'Saint-Joseph', lat: 48.0790, lng: 7.3480,
    week: [['09:00', '12:00'], ['14:00', '19:00']], saturday: [['09:00', '18:00']],
    staff: [{ name: 'Khady', bio: 'Box braids, nattes et tresses homme.' }],
    services: [
      { cat: 'box-braids', name: 'Box braids', price: 100, duration: 270 },
      { cat: 'nattes-collees', name: 'Cornrows avec mèches', price: 55, duration: 120 },
      { cat: 'homme', name: 'Nattes plaquées homme', price: 30, duration: 60 },
      { cat: 'homme', name: 'Vanilles homme', price: 40, duration: 90 },
      { cat: 'enfants', name: 'Nattes enfant', price: 25, duration: 60 },
    ],
  },
  {
    owner: 'aminata@tressia.test', slug: 'aminata-ba', name: 'Aminata Ba', audience: 'femmes', status: 'published', cover: 'hairGallery.jpeg',
    mode: 'les_deux', fee: 15, zone: ['Strasbourg', 'Schiltigheim', 'Bischheim', 'Illkirch-Graffenstaden', 'Lingolsheim', 'Ostwald'],
    description: 'Locks, retwist et tresses à Neudorf. Je conseille sur la longueur et la couleur des mèches avant le rendez-vous.',
    phone: '+33 6 80 14 63 29', address: '52 route du Polygone', city: 'Strasbourg', neighborhood: 'Neudorf', lat: 48.5672, lng: 7.7603,
    week: [['09:30', '19:00']], saturday: [['09:00', '18:30']],
    staff: [{ name: 'Aminata', bio: 'Locks naturelles et retwist.' }],
    services: [
      { cat: 'locks', name: 'Retwist locks', price: 55, duration: 90 },
      { cat: 'locks', name: 'Création de locks', price: 180, duration: 300 },
      { cat: 'box-braids', name: 'Knotless braids moyennes', price: 140, duration: 300 },
      { cat: 'twists', name: 'Twists sénégalaises', price: 110, duration: 240 },
      { cat: 'crochet', name: 'Crochet braids bouclées', price: 65, duration: 120 },
    ],
  },
  {
    owner: 'ousmane@tressia.test', slug: 'ousmane-tresses', name: 'Ousmane Tresses', audience: 'hommes', status: 'published', cover: 'hair8.jpg',
    mode: 'chez_moi', fee: 0, zone: [],
    description: 'Tresses homme près de la gare de Mulhouse : nattes plaquées, vanilles et départ de locks.',
    phone: '+33 7 27 55 31 64', address: '9 avenue du Général Leclerc', city: 'Mulhouse', neighborhood: 'Gare', lat: 47.7425, lng: 7.3421,
    week: [['10:00', '20:00']], saturday: [['09:00', '20:00']],
    staff: [{ name: 'Ousmane', bio: 'Tresses homme et départ de locks.' }],
    services: [
      { cat: 'homme', name: 'Nattes plaquées homme', price: 25, duration: 45 },
      { cat: 'homme', name: 'Box braids homme', price: 50, duration: 120 },
      { cat: 'homme', name: 'Vanilles homme', price: 40, duration: 90 },
      { cat: 'locks', name: 'Départ de locks', price: 80, duration: 180 },
      { cat: 'enfants', name: 'Nattes garçon', price: 20, duration: 45 },
    ],
  },
  {
    owner: 'coumba@tressia.test', slug: 'coumba-sow', name: 'Coumba Sow', audience: 'femmes', status: 'pending', cover: 'hairGallery.jpeg',
    mode: 'domicile', fee: 10, zone: ['Mulhouse', 'Rixheim'],
    description: 'Nouvelle tresseuse à Mulhouse, je me déplace à domicile.',
    phone: '+33 6 02 41 88 53', address: '40 rue de Bâle', city: 'Mulhouse', neighborhood: 'Rebberg', lat: 47.7380, lng: 7.3450,
    week: [['10:00', '19:00']],
    staff: [{ name: 'Coumba', bio: 'Nattes collées et vanilles.' }],
    services: [{ cat: 'nattes-collees', name: 'Nattes collées', price: 35, duration: 60 }, { cat: 'twists', name: 'Vanilles', price: 70, duration: 180 }],
  },
]

const CLIENT_ADDRESSES = ['8 rue des Vergers', '3 allée des Tilleuls', '15 rue du Moulin', '27 rue de la Paix']
function homeFields(home: boolean, def: SeedSalon, i: number) {
  if (!home) return { location: 'chez_tresseuse' as const, clientAddress: null, clientCity: null }
  return { location: 'domicile' as const, clientAddress: CLIENT_ADDRESSES[i % CLIENT_ADDRESSES.length]!, clientCity: def.zone[i % def.zone.length]! }
}

/** Heure locale de Paris (heure d'ete comprise) -> instant UTC */
const at = (date: string, hhmm: string) => { const [h, m] = hhmm.split(':').map(Number) as [number, number]; return new Date(zonedTimeToUtc(date, h * 60 + m)) }
const addMin = (d: Date, m: number) => new Date(d.getTime() + m * 60_000)
const dateIn = (days: number) => localDateOf(new Date(Date.now() + days * DAY))

const COMMENTS = [
  'Très bon accueil, travail soigné. Je reviendrai.',
  'Ponctuelle et rapide, le résultat tient bien.',
  'Bon rapport qualité prix. Un peu d\'attente au début mais rien de grave.',
  'Elle a pris le temps de bien démêler, merci !',
  'Accueil chaleureux, ambiance calme. Je recommande.',
  'Les nattes sont nettes, exactement ce que je voulais.',
  'Correct, mais le rendez-vous a commencé avec 20 minutes de retard.',
  null,
]

let reviewIdx = 0
const futureSlots: { salonId: number; staffId: number; clientId: number; date: string; time: string; serviceIdx: number }[] = []

for (const [si, def] of SALONS.entries()) {
  const [salon] = await db.insert(salons).values({
    ownerId: userId(def.owner), slug: def.slug, name: def.name, description: def.description, phone: def.phone, whatsapp: def.phone,
    address: def.address, city: def.city, neighborhood: def.neighborhood, lat: def.lat, lng: def.lng, audience: def.audience,
    status: def.status, serviceMode: def.mode, travelFeeEur: def.fee, travelZone: def.zone,
    coverUrl: img(COVERS[def.slug] ?? def.cover), createdAt: new Date(Date.now() - (120 - si * 10) * DAY),
  }).returning()
  const s = salon!
  const hoursFor = (wd: number): Range[] => (wd === 0 ? def.sunday ?? [] : wd === 6 ? def.saturday ?? def.week : def.week)
  const hours = []
  for (let wd = 0; wd <= 6; wd++) for (const [o, c] of hoursFor(wd)) hours.push({ salonId: s.id, weekday: wd, opensAt: o, closesAt: c })
  await db.insert(openingHours).values(hours)
  const staffRows = await db.insert(staff).values(def.staff.map((x, i) => ({ salonId: s.id, name: x.name, bio: x.bio, position: i }))).returning()
  const svc = await db.insert(services).values(def.services.map((x, i) => ({
    salonId: s.id, categoryId: catId(x.cat), name: x.name, description: x.description ?? null, priceEur: x.price, durationMin: x.duration, position: i,
    imageUrl: CAT_IMAGE[x.cat] ? img(CAT_IMAGE[x.cat]!) : null,
  }))).returning()
  const gallery = [COVERS[def.slug] ?? def.cover, ...GALLERY[def.audience]!.filter((f) => f !== COVERS[def.slug])].slice(0, 5)
  await db.insert(salonPhotos).values(gallery.map((f, i) => ({ salonId: s.id, url: img(f), position: i })))
  if (def.status !== 'published') continue

  if (si === 3) await db.insert(closures).values({ salonId: s.id, startsOn: dateIn(20), endsOn: dateIn(22), reason: 'Congés annuels' })

  // Reservations passees honorees, une par jour ouvre, avec avis
  let made = 0
  for (let back = 2; made < 6 && back < 60; back += 3) {
    const date = dateIn(-back)
    const ranges = hoursFor(weekdayOf(date))
    if (!ranges.length) continue
    const service = svc[(made + si) % svc.length]!
    const start = at(date, ranges[0]![0])
    const startsAt = addMin(start, 60)
    const endsAt = addMin(startsAt, service.durationMin)
    const clientId = clientIds[(made + si) % clientIds.length]!
    const home = def.mode === 'domicile' || (def.mode === 'les_deux' && made % 2 === 1)
    const fee = home ? def.fee : 0
    const [b] = await db.insert(bookings).values({
      salonId: s.id, clientId, staffId: staffRows[made % staffRows.length]!.id, startsAt, endsAt, status: 'completed',
      ...homeFields(home, def, made), travelFeeEur: fee, totalPriceEur: service.priceEur + fee, createdAt: addMin(startsAt, -3 * 24 * 60),
    }).returning()
    await db.insert(bookingItems).values({ bookingId: b!.id, serviceId: service.id, name: service.name, priceEur: service.priceEur, durationMin: service.durationMin })
    if (made < 5) {
      const rating = reviewIdx % 7 === 6 ? 3 : reviewIdx % 3 === 0 ? 4 : 5
      await db.insert(reviews).values({ bookingId: b!.id, salonId: s.id, clientId, rating, comment: COMMENTS[reviewIdx % COMMENTS.length], createdAt: addMin(endsAt, 180) })
      reviewIdx++
    }
    made++
  }

  // Reservations futures confirmees
  const plan = si === 0 ? [{ days: 2, client: userId('client@tressia.test') }, { days: 4, client: clientIds[1]! }] : [{ days: 3 + si, client: clientIds[(si + 2) % clientIds.length]! }]
  for (const [pi, p] of plan.entries()) {
    let days = p.days
    while (!hoursFor(weekdayOf(dateIn(days))).length) days++
    const date = dateIn(days)
    const first = hoursFor(weekdayOf(date))[0]!
    const startsAt = addMin(at(date, first[0]), 120)
    const service = svc[si === 0 && pi === 0 ? 4 : pi % svc.length]!
    const home = def.mode === 'domicile' || (def.mode === 'les_deux' && pi === 1)
    const fee = home ? def.fee : 0
    const [b] = await db.insert(bookings).values({
      salonId: s.id, clientId: p.client, staffId: staffRows[pi % staffRows.length]!.id, startsAt, endsAt: addMin(startsAt, service.durationMin),
      status: 'confirmed', ...homeFields(home, def, pi), travelFeeEur: fee, totalPriceEur: service.priceEur + fee, clientNote: si === 0 && pi === 0 ? 'Cheveux assez longs, merci de prévoir le démêlage.' : null,
    }).returning()
    await db.insert(bookingItems).values({ bookingId: b!.id, serviceId: service.id, name: service.name, priceEur: service.priceEur, durationMin: service.durationMin })
    futureSlots.push({ salonId: s.id, staffId: b!.staffId, clientId: p.client, date, time: startsAt.toISOString(), serviceIdx: 0 })
  }
}

console.log(`Seed terminé : ${SALONS.length} tresseuses, ${userRows.length} comptes, ${reviewIdx} avis, ${futureSlots.length} réservations à venir. Mot de passe : tressia123`)
await sqlClient.end()
