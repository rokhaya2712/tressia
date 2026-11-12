import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { fileURLToPath } from 'node:url'

const TEST_URL = 'postgres://tressia:tressia@localhost:54329/tressia_test'

export default async function setup() {
  const client = postgres(process.env.TEST_DATABASE_URL ?? TEST_URL, { max: 1, onnotice: () => {} })
  try {
    await migrate(drizzle(client), { migrationsFolder: fileURLToPath(new URL('../src/db/migrations', import.meta.url)) })
  } finally {
    await client.end()
  }
}
