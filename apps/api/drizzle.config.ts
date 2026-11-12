import { defineConfig } from 'drizzle-kit'
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgres://tressia:tressia@localhost:54329/tressia' },
})
