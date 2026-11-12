import { zonedTimeToUtc } from '@tressia/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { sentMails } from '../src/lib/mailer.ts'
import { app, createSalonFixture, createUser, nextWeekday, resetDb } from './helpers.ts'

function call(path: string, cookie: string, method = 'GET', body?: unknown) {
  return app.request(path, { method, headers: { cookie, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
}
const get = async (path: string) => {
  const res = await app.request(path)
  return { status: res.status, body: await res.json() as any }
}
const startsAt = () => new Date(zonedTimeToUtc(nextWeekday(2), 9 * 60)).toISOString()

describe('tresseuses : deplacement a domicile', () => {
  beforeEach(async () => {
    await resetDb()
    sentMails.length = 0
  })

  it('reserve a domicile dans la zone : frais ajoutes au total, adresse de la cliente enregistree', async () => {
    const owner = await createUser('owner')
    const fx = await createSalonFixture(owner.user.id, { serviceMode: 'les_deux', travelFeeEur: 15, travelZone: ['Mulhouse', 'Riedisheim'] })
    const client = await createUser('client')
    const res = await call('/api/bookings', client.cookie, 'POST', {
      salonId: fx.salon.id, serviceIds: [fx.services[1]!.id], staffId: null, startsAt: startsAt(),
      location: 'domicile', clientAddress: '4 rue des Lilas', clientCity: 'Riedisheim',
    })
    expect(res.status).toBe(201)
    const { booking } = await res.json()
    expect(booking).toMatchObject({ location: 'domicile', clientAddress: '4 rue des Lilas', clientCity: 'Riedisheim', travelFeeEur: 15, totalPriceEur: 45 })

    await new Promise((r) => setTimeout(r, 50))
    const toClient = sentMails.find((m) => m.to === client.user.email)!
    expect(toClient.text).toContain('4 rue des Lilas, Riedisheim')
    expect(toClient.text).toContain('Frais de déplacement : 15 €')
    // A domicile, l'adresse de la tresseuse n'est pas envoyee
    expect(toClient.text).not.toContain('Rue 123')
  })

  it('chez la tresseuse : pas de frais, adresse communiquee apres reservation seulement', async () => {
    const owner = await createUser('owner')
    const fx = await createSalonFixture(owner.user.id, { slug: 'fatou', serviceMode: 'les_deux', travelFeeEur: 15, travelZone: ['Mulhouse'] })
    expect((await get('/api/salons/fatou')).body.address).toBeNull()

    const client = await createUser('client')
    const res = await call('/api/bookings', client.cookie, 'POST', { salonId: fx.salon.id, serviceIds: [fx.services[1]!.id], staffId: null, startsAt: startsAt() })
    const { booking } = await res.json()
    expect(booking).toMatchObject({ location: 'chez_tresseuse', travelFeeEur: 0, totalPriceEur: 30, clientAddress: null })
    await new Promise((r) => setTimeout(r, 50))
    expect(sentMails.find((m) => m.to === client.user.email)!.text).toContain('Rue 123')
  })

  it('refuse le domicile hors zone, si non propose, et le salon si elle ne fait que le domicile', async () => {
    const owner = await createUser('owner')
    const mobile = await createSalonFixture(owner.user.id, { serviceMode: 'domicile', travelFeeEur: 10, travelZone: ['Mulhouse'] })
    const fixe = await createSalonFixture(owner.user.id, { serviceMode: 'chez_moi' })
    const client = await createUser('client')
    const base = { serviceIds: [mobile.services[1]!.id], staffId: null, startsAt: startsAt() }

    const horsZone = await call('/api/bookings', client.cookie, 'POST', { ...base, salonId: mobile.salon.id, location: 'domicile', clientAddress: '1 place', clientCity: 'Colmar' })
    expect(horsZone.status).toBe(400)
    expect((await horsZone.json()).error.code).toBe('out_of_zone')

    const chezElle = await call('/api/bookings', client.cookie, 'POST', { ...base, salonId: mobile.salon.id })
    expect((await chezElle.json()).error.code).toBe('home_only')

    const nonPropose = await call('/api/bookings', client.cookie, 'POST', { ...base, serviceIds: [fixe.services[1]!.id], salonId: fixe.salon.id, location: 'domicile', clientAddress: '1 rue', clientCity: 'Mulhouse' })
    expect((await nonPropose.json()).error.code).toBe('home_not_offered')

    const sansAdresse = await call('/api/bookings', client.cookie, 'POST', { ...base, salonId: mobile.salon.id, location: 'domicile' })
    expect(sansAdresse.status).toBe(400)
  })

  it('recherche : mode domicile filtre par zone de deplacement', async () => {
    const owner = await createUser('owner')
    await createSalonFixture(owner.user.id, { slug: 'fixe', serviceMode: 'chez_moi', city: 'Mulhouse' })
    await createSalonFixture(owner.user.id, { slug: 'mobile', serviceMode: 'domicile', city: 'Mulhouse', travelZone: ['Mulhouse', 'Illzach'], travelFeeEur: 10 })
    await createSalonFixture(owner.user.id, { slug: 'mixte', serviceMode: 'les_deux', city: 'Colmar', neighborhood: 'Centre', travelZone: ['Colmar'] })

    const slugs = async (q: string) => (await get(`/api/salons?${q}`)).body.items.map((s: any) => s.slug).sort()
    expect(await slugs('mode=domicile')).toEqual(['mixte', 'mobile'])
    expect(await slugs('mode=domicile&city=Illzach')).toEqual(['mobile'])
    expect(await slugs('mode=chez_tresseuse')).toEqual(['fixe', 'mixte'])
    expect(await slugs('city=Mulhouse')).toEqual(['fixe', 'mobile'])
    const card = (await get('/api/salons?mode=domicile&city=Illzach')).body.items[0]
    expect(card).toMatchObject({ serviceMode: 'domicile', travelFeeEur: 10, travelZone: ['Mulhouse', 'Illzach'] })
  })
})
