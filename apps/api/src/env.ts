import { fileURLToPath } from 'node:url'

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://tressia:tressia@localhost:54329/tressia',
  port: Number(process.env.PORT ?? process.env.API_PORT ?? 3333),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  /** En production sans SMTP_HOST, les e-mails sont seulement journalises. */
  mailEnabled: process.env.NODE_ENV !== 'production' || !!process.env.SMTP_HOST,
  smtpHost: process.env.SMTP_HOST ?? 'localhost',
  smtpPort: Number(process.env.SMTP_PORT ?? 1025),
  mailFrom: process.env.MAIL_FROM ?? 'Tressia <reservations@tressia.test>',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  uploadsDir: fileURLToPath(new URL('../uploads/', import.meta.url)),
  /** Build du site (apps/web/dist), servi par l'API en production. */
  webDist: fileURLToPath(new URL('../../web/dist/', import.meta.url)),
}
