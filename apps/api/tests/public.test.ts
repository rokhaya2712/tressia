import { beforeEach, describe, expect, it } from 'vitest'
import { pickFreeStaff } from '../src/modules/availability/service.ts'
import { bookings, closures } from '../src/db/schema.ts'
import { app, createSalonFixture, createUser, db, nextWeekday, resetDb } from './helpers.ts'

const get = async (url: string) => {
  const res = await app.request(url)
  return { status: res.status, body: await res.json() }
}

describe('routes publiques', () => {
  beforeEach(resetDb)

  it('liste les categories et les villes des salons publies', async () => {
    const { user } = await createUser('owner')
    await createSalonFixture(user.id, { city: 'Mulhouse', neighborhood: 'Dornach' })
    await createSalonFixture(user.id, { city: 'Colmar', neighborhood: 'Saint-Joseph', status: 'pending' })
    expect((await get('/api/categories')).body.length).toBeGreaterThan(5)
    expect((await get('/api/cities')).body).toEqual([{ city: 'Mulhouse', neighborhoods: ['Dornach'] }])
  })

  it('filtre les salons et masque les salons en attente', async () => {
    const { user } = await createUser('owner')
    const a = await createSalonFixture(user.id, { slug: 'awa', name: 'Maison Awa', audience: 'femmes', lat: 47.7466, lng: 7.3384 })
    await createSalonFixture(user.id, { slug: 'dorian', name: 'Studio Dorian', audience: 'hommes', neighborhood: 'Bourtzwiller', lat: 47.7702, lng: 7.3268 })
    await createSalonFixture(user.id, { slug: 'cache', name: 'Salon Caché', status: 'pending' })

    const all = await get('/api/salons')
    expect(all.body.total).toBe(2)
    expect(all.body.pageSize).toBe(12)
    expect(all.body.items[0]).toMatchObject({ minPriceEur: 30, reviewCount: 0, rating: null })
    expect((await get('/api/salons?audience=hommes')).body.items.map((s: any) => s.slug)).toEqual(['dorian'])
    expect((await get('/api/salons?neighborhood=Bourtzwiller')).body.total).toBe(1)
    expect((await get('/api/salons?q=knotless')).body.total).toBe(2)
    expect((await get('/api/salons?q=awa')).body.items[0].slug).toBe('awa')
    expect((await get('/api/salons?category=locks')).body.total).toBe(0)
    expect((await get('/api/salons?category=box-braids')).body.total).toBe(2)
    expect((await get('/api/salons?maxPrice=20')).body.total).toBe(0)
    const geo = await get('/api/salons?lat=47.7466&lng=7.3384&radiusKm=2')
    expect(geo.body.items.map((s: any) => s.slug)).toEqual(['awa'])
    expect(geo.body.items[0].distanceKm).toBe(0)

    const sunday = nextWeekday(0)
    expect((await get(`/api/salons?date=${sunday}`)).body.total).toBe(0)
    expect((await get(`/api/salons?date=${nextWeekday(2)}`)).body.total).toBe(2)

    await db.insert(closures).values({ salonId: a.salon.id, startsOn: nextWeekday(2), endsOn: nextWeekday(2) })
    expect((await get(`/api/salons?date=${nextWeekday(2)}`)).body.total).toBe(1)

    expect((await get('/api/salons/cache')).status).toBe(404)
    const detail = await get('/api/salons/awa')
    expect(detail.status).toBe(200)
    expect(detail.body.services).toHaveLength(3)
    expect(detail.body.staff.map((s: any) => s.name)).toEqual(['Awa', 'Karim'])
    expect(detail.body.hours[0]).toEqual({ weekday: 1, opensAt: '08:00', closesAt: '12:00' })
  })

  it('disponibilites et choix du coiffeur', async () => {
    const { user } = await createUser('owner')
    const client = await createUser('client')
    const f = await createSalonFixture(user.id, { slug: 'awa' })
    const date = nextWeekday(3)
    const tresses = f.services[0]!
    const res = await get(`/api/salons/awa/availability?date=${date}&serviceIds=${tresses.id}`)
    expect(res.status).toBe(200)
    expect(res.body.durationMin).toBe(120)
    expect(res.body.slots[0]).toEqual({ startsAt: `${date}T07:00:00.000Z`, staffIds: [f.staff[0]!.id, f.staff[1]!.id] })
    expect(res.body.slots.some((s: any) => s.startsAt === `${date}T10:15:00.000Z`)).toBe(false)

    expect((await get(`/api/salons/awa/availability?date=${date}&serviceIds=99999`)).status).toBe(400)

    const startsAt = new Date(`${date}T09:00:00.000Z`)
    await db.insert(bookings).values({ salonId: f.salon.id, clientId: client.user.id, staffId: f.staff[0]!.id, startsAt, endsAt: new Date(startsAt.getTime() + 7200_000), totalPriceEur: 120 })
    const picked = await db.transaction((tx) => pickFreeStaff(tx, f.salon.id, startsAt, 120, null))
    expect(picked).toBe(f.staff[1]!.id)
    expect(await db.transaction((tx) => pickFreeStaff(tx, f.salon.id, startsAt, 120, f.staff[0]!.id))).toBeNull()
    expect(await db.transaction((tx) => pickFreeStaff(tx, f.salon.id, new Date(`${date}T09:05:00.000Z`), 30, null))).toBeNull()
    // Sans preference : le moins charge ce jour-la
    const later = new Date(`${date}T14:00:00.000Z`)
    expect(await db.transaction((tx) => pickFreeStaff(tx, f.salon.id, later, 30, null))).toBe(f.staff[1]!.id)
  })

  it('avis et coiffeurs du jour', async () => {
    const { user } = await createUser('owner')
    await createSalonFixture(user.id, { slug: 'awa' })
    const staffToday = await get('/api/salons/awa/staff-today')
    expect(staffToday.status).toBe(200)
    expect(staffToday.body).toHaveLength(2)
    expect((await get('/api/salons/awa/reviews')).body).toEqual([])
  })
})
