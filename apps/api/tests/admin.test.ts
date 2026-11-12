import { beforeEach, describe, expect, it } from 'vitest'
import { app, createSalonFixture, createUser, resetDb } from './helpers.ts'

const call = (path: string, cookie: string, method = 'GET') => app.request(path, { method, headers: { cookie } })

describe('administration', () => {
  beforeEach(resetDb)

  it('refuse un client (403)', async () => {
    const client = await createUser('client')
    expect((await call('/api/admin/salons', client.cookie)).status).toBe(403)
    expect((await call('/api/admin/users', client.cookie)).status).toBe(403)
  })

  it('liste, publie et suspend les salons ; liste les utilisateurs', async () => {
    const admin = await createUser('admin')
    const owner = await createUser('owner')
    const { salon } = await createSalonFixture(owner.user.id, { status: 'pending' })
    const pending = await (await call('/api/admin/salons?status=pending', admin.cookie)).json()
    expect(pending.salons).toHaveLength(1)
    expect(pending.salons[0]).toMatchObject({ id: salon.id, ownerEmail: owner.user.email, serviceCount: 3, bookingCount: 0 })

    const pub = await call(`/api/admin/salons/${salon.id}/publish`, admin.cookie, 'POST')
    expect(pub.status).toBe(200)
    expect((await pub.json()).salon.status).toBe('published')
    const sus = await (await call(`/api/admin/salons/${salon.id}/suspend`, admin.cookie, 'POST')).json()
    expect(sus.salon.status).toBe('suspended')
    expect((await call('/api/admin/salons/99999/publish', admin.cookie, 'POST')).status).toBe(404)

    const users = await (await call('/api/admin/users', admin.cookie)).json()
    expect(users.users).toHaveLength(2)
    expect(users.users[0].createdAt).toBeTypeOf('string')
  })
})
