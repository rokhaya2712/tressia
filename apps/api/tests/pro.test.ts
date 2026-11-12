import { beforeEach, describe, expect, it } from 'vitest'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { env } from '../src/env.ts'
import { bookings } from '../src/db/schema.ts'
import { sentMails } from '../src/lib/mailer.ts'
import { app, createSalonFixture, createUser, db, resetDb } from './helpers.ts'

function call(path: string, cookie: string, method = 'GET', body?: unknown) {
  return app.request(path, { method, headers: { cookie, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
}

describe('espace pro', () => {
  beforeEach(async () => {
    await resetDb()
    sentMails.length = 0
  })

  it('cree un salon (slug sans accents, en attente) puis refuse un second salon', async () => {
    const owner = await createUser('owner')
    expect((await call('/api/pro/salon', owner.cookie)).status).toBe(404)
    const body = { name: 'Élégance Coiffure', audience: 'femmes', address: '12 rue du Sauvage', city: 'Mulhouse', neighborhood: 'Centre-ville' }
    const res = await call('/api/pro/salon', owner.cookie, 'POST', body)
    expect(res.status).toBe(201)
    const { salon } = await res.json()
    expect(salon.slug).toBe('elegance-coiffure')
    expect(salon.status).toBe('pending')
    expect((await call('/api/pro/salon', owner.cookie, 'POST', body)).status).toBe(409)
    const other = await createUser('owner')
    const second = await (await call('/api/pro/salon', other.cookie, 'POST', body)).json()
    expect(second.salon.slug).toBe('elegance-coiffure-2')
  })

  it('gere horaires, prestations, coiffeurs et galerie', async () => {
    const owner = await createUser('owner')
    const fx = await createSalonFixture(owner.user.id)
    expect((await call('/api/pro/salon/hours', owner.cookie, 'PUT', { hours: [{ weekday: 1, opensAt: '18:00', closesAt: '09:00' }] })).status).toBe(400)
    const hours = await (await call('/api/pro/salon/hours', owner.cookie, 'PUT', { hours: [{ weekday: 1, opensAt: '09:00', closesAt: '18:00' }] })).json()
    expect(hours.hours).toEqual([{ weekday: 1, opensAt: '09:00', closesAt: '18:00' }])

    const created = await call('/api/pro/services', owner.cookie, 'POST', { categoryId: 1, name: 'Nattes', priceEur: 70, durationMin: 60 })
    expect(created.status).toBe(201)
    expect((await call('/api/pro/services', owner.cookie, 'POST', { categoryId: 9999, name: 'X', priceEur: 1, durationMin: 60 })).status).toBe(400)
    const { service } = await created.json()
    expect((await call(`/api/pro/services/${service.id}`, owner.cookie, 'PATCH', { priceEur: 80 })).status).toBe(200)
    expect((await call(`/api/pro/services/${service.id}`, owner.cookie, 'DELETE')).status).toBe(200)

    const staffRes = await call('/api/pro/staff', owner.cookie, 'POST', { name: 'Afi' })
    expect(staffRes.status).toBe(201)
    const sid = (await staffRes.json()).staff.id
    const off = await call(`/api/pro/staff/${sid}/time-off`, owner.cookie, 'POST', { startsAt: '2030-01-01T08:00:00+01:00', endsAt: '2030-01-01T12:00:00+01:00' })
    expect(off.status).toBe(201)

    // Coiffeur avec rendez-vous a venir : 409
    const client = await createUser('client')
    const future = new Date(Date.now() + 5 * 86400_000)
    await db.insert(bookings).values({ salonId: fx.salon.id, clientId: client.user.id, staffId: fx.staff[0]!.id, startsAt: future, endsAt: new Date(future.getTime() + 1800_000), totalPriceEur: 30 })
    const del = await call(`/api/pro/staff/${fx.staff[0]!.id}`, owner.cookie, 'DELETE')
    expect(del.status).toBe(409)
    expect((await del.json()).error.code).toBe('staff_has_bookings')

    const p1 = await (await call('/api/pro/gallery', owner.cookie, 'POST', { url: '/uploads/a.webp' })).json()
    const p2 = await (await call('/api/pro/gallery', owner.cookie, 'POST', { url: '/uploads/b.webp' })).json()
    const reordered = await (await call('/api/pro/gallery', owner.cookie, 'PATCH', { ids: [p2.photo.id, p1.photo.id] })).json()
    expect(reordered.photos.map((p: { id: number }) => p.id)).toEqual([p2.photo.id, p1.photo.id])

    const detail = await (await call('/api/pro/salon', owner.cookie)).json()
    expect(detail.salon.services.length).toBe(3)
    expect(detail.salon.staff.length).toBe(3)
  })

  it('un proprietaire ne voit ni ne modifie les donnees d un autre (404)', async () => {
    const a = await createUser('owner')
    const b = await createUser('owner')
    const fxA = await createSalonFixture(a.user.id)
    const fxB = await createSalonFixture(b.user.id)
    const client = await createUser('client')
    const at = new Date(Date.now() + 3 * 86400_000)
    const [bk] = await db.insert(bookings).values({ salonId: fxB.salon.id, clientId: client.user.id, staffId: fxB.staff[0]!.id, startsAt: at, endsAt: new Date(at.getTime() + 1800_000), totalPriceEur: 30 }).returning()

    const mine = await (await call('/api/pro/salon', a.cookie)).json()
    expect(mine.salon.id).toBe(fxA.salon.id)
    expect((await call(`/api/pro/services/${fxB.services[0]!.id}`, a.cookie, 'PATCH', { priceEur: 1 })).status).toBe(404)
    expect((await call(`/api/pro/services/${fxB.services[0]!.id}`, a.cookie, 'DELETE')).status).toBe(404)
    expect((await call(`/api/pro/staff/${fxB.staff[0]!.id}`, a.cookie, 'PATCH', { name: 'Pirate' })).status).toBe(404)
    expect((await call(`/api/pro/staff/${fxB.staff[0]!.id}/time-off`, a.cookie)).status).toBe(404)
    expect((await call(`/api/pro/bookings/${bk!.id}/cancel`, a.cookie, 'POST', { reason: 'Test pirate' })).status).toBe(404)
    const agenda = await (await call('/api/pro/bookings', a.cookie)).json()
    expect(agenda.bookings).toEqual([])
    const agendaB = await (await call('/api/pro/bookings', b.cookie)).json()
    expect(agendaB.bookings).toHaveLength(1)
  })

  it('refuse l acces pro a un client (403)', async () => {
    const client = await createUser('client')
    expect((await call('/api/pro/salon', client.cookie)).status).toBe(403)
  })

  it('honore / absent seulement apres l heure ; annulation salon avec e-mail', async () => {
    const owner = await createUser('owner')
    const fx = await createSalonFixture(owner.user.id)
    const client = await createUser('client')
    const future = new Date(Date.now() + 2 * 86400_000)
    const past = new Date(Date.now() - 3600_000)
    const [f, p] = await db.insert(bookings).values([
      { salonId: fx.salon.id, clientId: client.user.id, staffId: fx.staff[0]!.id, startsAt: future, endsAt: new Date(future.getTime() + 1800_000), totalPriceEur: 30 },
      { salonId: fx.salon.id, clientId: client.user.id, staffId: fx.staff[1]!.id, startsAt: past, endsAt: new Date(past.getTime() + 1800_000), totalPriceEur: 50 },
    ]).returning()
    const early = await call(`/api/pro/bookings/${f!.id}/complete`, owner.cookie, 'POST')
    expect(early.status).toBe(400)
    expect((await early.json()).error.code).toBe('too_early')
    expect((await call(`/api/pro/bookings/${p!.id}/no-show`, owner.cookie, 'POST')).status).toBe(200)
    expect((await call(`/api/pro/bookings/${p!.id}/complete`, owner.cookie, 'POST')).status).toBe(400)

    const cancel = await call(`/api/pro/bookings/${f!.id}/cancel`, owner.cookie, 'POST', { reason: 'Coiffeuse malade' })
    expect(cancel.status).toBe(200)
    expect((await cancel.json()).booking.status).toBe('cancelled_by_salon')
    await new Promise((r) => setTimeout(r, 20))
    expect(sentMails.some((m) => m.to === client.user.email && m.text.includes('Coiffeuse malade'))).toBe(true)

    const stats = await (await call('/api/pro/stats', owner.cookie)).json()
    expect(stats.salonStatus).toBe('published')
    expect(Array.isArray(stats.upcoming)).toBe(true)
    expect(typeof stats.weekRevenueEur).toBe('number')
  })

  it('televerse une image en webp et refuse un faux fichier', async () => {
    const owner = await createUser('owner')
    await createSalonFixture(owner.user.id)
    const png = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: '#9C3F2A' } }).png().toBuffer()
    const form = new FormData()
    form.append('file', new File([new Uint8Array(png)], 'photo.png', { type: 'image/png' }))
    const res = await app.request('/api/pro/uploads', { method: 'POST', headers: { cookie: owner.cookie }, body: form })
    expect(res.status).toBe(201)
    const { url } = await res.json()
    expect(url).toMatch(/^\/uploads\/[a-f0-9]+\.webp$/)
    const saved = join(env.uploadsDir, url.replace('/uploads/', ''))
    expect((await sharp(saved).metadata()).width).toBe(1600)
    await rm(saved)

    const bad = new FormData()
    bad.append('file', new File([new TextEncoder().encode('pas une image du tout')], 'x.png', { type: 'image/png' }))
    expect((await app.request('/api/pro/uploads', { method: 'POST', headers: { cookie: owner.cookie }, body: bad })).status).toBe(400)
  })
})
