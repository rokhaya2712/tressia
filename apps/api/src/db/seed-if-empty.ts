// Au demarrage en production : remplit la base avec les donnees de demo seulement si elle est vide.
import { sql } from 'drizzle-orm'
import { db, sqlClient } from './client.ts'

const [row] = await db.execute<{ n: number }>(sql`select count(*)::int as n from categories`)
if (Number(row?.n ?? 0) > 0) {
  console.log('Base deja remplie, pas de seed.')
  await sqlClient.end()
} else {
  await import('./seed.ts')
}
