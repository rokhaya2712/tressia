import { zonedTimeToUtc } from '@tressia/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { bookingItems, bookings, services } from '../src/db/schema.ts'
import { sentMails } from '../src/lib/mailer.ts'
import { app, createSalonFixture, createUser, db, nextWeekday, resetDb } from './helpers.ts'

function call(path: string, cookie: string, method = 'GET', body?: unknown) {
  return app.request(path, { method, headers: { cookie, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
}

async function setup() {
  const owner = await createUser('owner')
  const fx = await createSalonFixture(owner.user.id)
  const client = await createUser('client')
  const startsAt = new Date(zonedTimeToUtc(nextWeekday(2), 9 * 60)).toISOString() // mardi 09:00 heure de Paris
  return { owner, fx, client, startsAt }
}

describe('reservations client', () => {
  beforeEach(async () => {
    await resetDb()
    sentMails.length = 0
  })

  it('cree une reservation avec instantane des prestations et envoie les e-mails', async () => {
    const { fx, client, startsAt } = await setup()
    const res = await call('/api/bookings', client.cookie, 'POST', {
      salonId: fx.salon.id, serviceIds: [fx.services[1]!.id, fx.services[2]!.id], staffId: null, startsAt, note: 'Merci',
    })
    expect(res.status).toBe(201)
    const { booking } = await res.json()
    expect(booking.status).toBe('confirmed')
    expect(booking.totalPriceEur).toBe(80)
    expect(new Date(booking.endsAt).getTime() - new Date(booking.startsAt).getTime()).toBe(75 * 60_000)
    expect(booking.items.map((i: { name: string }) => i.name)).toEqual(['Nattes plaquées homme', 'Nattes enfant'])
    expect(booking.canCancel).toBe(true)

    // L'instantane ne bouge pas si le salon change ses prix
    await db.update(services).set({ priceEur: 99999, name: 'Autre' })
    const items = await db.select().from(bookingItems)
    expect(items.map((i) => i.priceEur).sort()).toEqual([30, 50])

    await new Promise((r) => setTimeout(r, 50))
    expect(sentMails.map((m) => m.to).sort()).toEqual([client.user.email, (await db.query.users.findFirst({ where: (u, { eq }) => eq(u.role, 'owner') }))!.email].sort())
    const dashes = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`)
    expect(sentMails.every((m) => !dashes.test(m.text + m.html))).toBe(true)

    const mine = await (await call('/api/me/bookings', client.cookie)).json()
    expect(mine.upcoming).toHaveLength(1)
    expect(mine.past).toHaveLength(0)
  })

  it('refuse une prestation inactive ou d un autre salon (400)', async () => {
    const { fx, client, startsAt } = await setup()
    await db.update(services).set({ active: false })
    const res = await call('/api/bookings', client.cookie, 'POST', { salonId: fx.salon.id, serviceIds: [fx.services[0]!.id], staffId: null, startsAt })
    expect(res.status).toBe(400)
  })

  it('deux reservations simultanees sur le meme creneau et le meme coiffeur : un 201 et un 409', async () => {
    const { fx, client, startsAt } = await setup()
    const other = await createUser('client')
    const body = { salonId: fx.salon.id, serviceIds: [fx.services[1]!.id], staffId: fx.staff[0]!.id, startsAt }
    const results = await Promise.all([call('/api/bookings', client.cookie, 'POST', body), call('/api/bookings', other.cookie, 'POST', body)])
    const statuses = results.map((r) => r.status).sort()
    expect(statuses).toEqual([201, 409])
    const loser = results.find((r) => r.status === 409)!
    expect((await loser.json()).error.code).toBe('slot_taken')
    expect(await db.select().from(bookings)).toHaveLength(1)
  })

  it('refuse l annulation a moins de 2 h et accepte au dela', async () => {
    const { fx, client, startsAt } = await setup()
    const soon = new Date(Date.now() + 90 * 60_000)
    const [late] = await db.insert(bookings).values({
      salonId: fx.salon.id, clientId: client.user.id, staffId: fx.staff[1]!.id, startsAt: soon, endsAt: new Date(soon.getTime() + 30 * 60_000), totalPriceEur: 30,
    }).returning()
    const r1 = await call(`/api/me/bookings/${late!.id}/cancel`, client.cookie, 'POST')
    expect(r1.status).toBe(400)
    expect((await r1.json()).error.code).toBe('too_late')

    const created = await call('/api/bookings', client.cookie, 'POST', { salonId: fx.salon.id, serviceIds: [fx.services[1]!.id], staffId: null, startsAt })
    const { booking } = await created.json()
    const stranger = await createUser('client')
    expect((await call(`/api/me/bookings/${booking.id}/cancel`, stranger.cookie, 'POST')).status).toBe(404)
    const r2 = await call(`/api/me/bookings/${booking.id}/cancel`, client.cookie, 'POST')
    expect(r2.status).toBe(200)
    expect((await r2.json()).booking.status).toBe('cancelled_by_client')
  })

  it('avis : seulement apres un rendez-vous honore, une seule fois', async () => {
    const { fx, client } = await setup()
    const past = new Date(Date.now() - 3 * 86400_000)
    const [b] = await db.insert(bookings).values({
      salonId: fx.salon.id, clientId: client.user.id, staffId: fx.staff[0]!.id, startsAt: past, endsAt: new Date(past.getTime() + 30 * 60_000), totalPriceEur: 30,
    }).returning()
    expect((await call(`/api/me/bookings/${b!.id}/review`, client.cookie, 'POST', { rating: 5 })).status).toBe(400)
    await db.update(bookings).set({ status: 'completed' })
    expect((await call(`/api/me/bookings/${b!.id}/review`, client.cookie, 'POST', { rating: 5, comment: 'Top' })).status).toBe(201)
    const again = await call(`/api/me/bookings/${b!.id}/review`, client.cookie, 'POST', { rating: 4 })
    expect(again.status).toBe(409)
    expect((await again.json()).error.code).toBe('already_reviewed')
  })

  it('exige une connexion (401)', async () => {
    const res = await app.request('/api/me/bookings')
    expect(res.status).toBe(401)
  })
})
