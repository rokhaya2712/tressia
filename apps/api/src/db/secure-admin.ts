// En production : remplace le mot de passe de demo du compte administrateur par ADMIN_PASSWORD
// (le mot de passe de demo est public dans le README). Sans ADMIN_PASSWORD, le compte admin est bloque.
import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { hashPassword } from '../lib/auth.ts'
import { db, sqlClient } from './client.ts'
import { users } from './schema.ts'

const pwd = process.env.ADMIN_PASSWORD
if (pwd && pwd.length < 10) console.warn('[admin] ADMIN_PASSWORD trop court (10 caracteres minimum), compte admin bloque.')
const secret = pwd && pwd.length >= 10 ? pwd : randomBytes(32).toString('hex')
await db.update(users).set({ passwordHash: await hashPassword(secret) }).where(eq(users.role, 'admin'))
console.log(pwd && pwd.length >= 10 ? '[admin] mot de passe administrateur defini depuis ADMIN_PASSWORD.' : '[admin] pas de ADMIN_PASSWORD : connexion administrateur desactivee.')
await sqlClient.end()
