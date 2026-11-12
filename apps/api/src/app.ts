import { existsSync, readFileSync } from 'node:fs'
import { relative } from 'node:path'
import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { errorHandler } from './lib/http.ts'
import { type AppEnv, loadUser, originGuard } from './lib/auth.ts'
import { authRoutes } from './modules/auth/routes.ts'
import { publicRoutes } from './modules/public/routes.ts'
import { bookingRoutes } from './modules/bookings/routes.ts'
import { proRoutes } from './modules/pro/routes.ts'
import { adminRoutes } from './modules/admin/routes.ts'
import { env } from './env.ts'

export function createApp() {
  const app = new Hono<AppEnv>()
  app.onError(errorHandler)
  app.use('/uploads/*', serveStatic({ root: './' }))
  const api = new Hono<AppEnv>()
  api.use('*', originGuard, loadUser)
  api.get('/health', (c) => c.json({ ok: true }))
  api.route('/auth', authRoutes)
  api.route('/', publicRoutes) // /categories, /cities, /salons...
  api.route('/', bookingRoutes) // /bookings, /me/bookings...
  api.route('/pro', proRoutes)
  api.route('/admin', adminRoutes)
  app.route('/api', api)

  // En production, le meme service sert aussi le site (build Vite) avec repli SPA.
  if (existsSync(env.webDist + 'index.html')) {
    const root = relative(process.cwd(), env.webDist) || '.'
    const indexHtml = readFileSync(env.webDist + 'index.html', 'utf8')
    app.use('/assets/*', async (c, next) => { await next(); c.header('Cache-Control', 'public, max-age=31536000, immutable') })
    app.use('*', serveStatic({ root }))
    app.get('*', (c) => (c.req.path.startsWith('/api/') || c.req.path.startsWith('/uploads/') ? c.json({ error: { code: 'not_found', message: 'Route inconnue' } }, 404) : c.html(indexHtml)))
  }
  app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Route inconnue' } }, 404))
  return app
}
