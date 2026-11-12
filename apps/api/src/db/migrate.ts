import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db, sqlClient } from './client.ts'

await migrate(db, { migrationsFolder: fileURLToPath(new URL('./migrations', import.meta.url)) })
console.log('Migrations appliquées')
await sqlClient.end()
