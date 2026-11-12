import { beforeEach, describe, expect, it } from 'vitest'
import { app, createUser, resetDb, TEST_PASSWORD } from './helpers.ts'

const json = (body: unknown, cookie?: string) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  body: JSON.stringify(body),
})
const cookieOf = (res: Response) => res.headers.get('set-cookie')!.split(';')[0]!

describe('auth', () => {
  beforeEach(resetDb)

  it('inscrit, connecte via cookie et refuse un e-mail deja pris', async () => {
    const body = { email: 'Awa@Test.fr', password: 'secret123', fullName: 'Awa Diallo', phone: '06 12 34 56 78', role: 'owner' }
    const res = await app.request('/api/auth/register', json(body))
    expect(res.status).toBe(201)
    const { user } = await res.json()
    expect(user).toMatchObject({ email: 'awa@test.fr', role: 'owner', fullName: 'Awa Diallo' })
    const me = await app.request('/api/auth/me', { headers: { cookie: cookieOf(res) } })
    expect((await me.json()).user.id).toBe(user.id)
    const again = await app.request('/api/auth/register', json(body))
    expect(again.status).toBe(409)
    expect((await again.json()).error.code).toBe('email_taken')
  })

  it('valide les champs', async () => {
    const res = await app.request('/api/auth/register', json({ email: 'x', password: '1', fullName: 'A', phone: '1' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('validation')
  })

  it('connecte, refuse un mauvais mot de passe et deconnecte', async () => {
    const { user } = await createUser('client', { email: 'karim@test.fr' })
    const bad = await app.request('/api/auth/login', json({ email: 'karim@test.fr', password: 'mauvais' }))
    expect(bad.status).toBe(401)
    expect((await bad.json()).error.code).toBe('invalid_credentials')
    const ok = await app.request('/api/auth/login', json({ email: 'KARIM@test.fr', password: TEST_PASSWORD }))
    expect(ok.status).toBe(200)
    expect((await ok.json()).user.id).toBe(user.id)
    const cookie = cookieOf(ok)
    await app.request('/api/auth/logout', json({}, cookie))
    const me = await app.request('/api/auth/me', { headers: { cookie } })
    expect((await me.json()).user).toBeNull()
  })

  it('me renvoie l utilisateur du cookie de helpers', async () => {
    const { user, cookie } = await createUser('admin')
    const me = await app.request('/api/auth/me', { headers: { cookie } })
    expect((await me.json()).user).toEqual(user)
  })
})
