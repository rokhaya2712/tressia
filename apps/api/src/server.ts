import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { env } from './env.ts'
import { copySeedAssets } from './lib/seedAssets.ts'

if (env.isProd) copySeedAssets()

serve({ fetch: createApp().fetch, port: env.port }, (info) => console.log(`API Tressia sur http://localhost:${info.port}`))
