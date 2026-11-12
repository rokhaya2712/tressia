import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { errorHandler } from './lib/http.ts'
import { type AppEnv, loadUser, originGuard } from './lib/auth.ts'
import { authRoutes } from './modules/auth/routes.ts'
import { publicRoutes } from './modules/public/routes.ts'
import { bookingRoutes } from './modules/bookings/routes.ts'
import { proRoutes } from './modules/pro/routes.ts'
import { adminRoutes } from './modules/admin/routes.ts'

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
  app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Route inconnue' } }, 404))
  return app
}
