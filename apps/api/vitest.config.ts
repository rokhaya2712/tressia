import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    env: { DATABASE_URL: 'postgres://tressia:tressia@localhost:54329/tressia_test', NODE_ENV: 'test', WEB_ORIGIN: 'http://localhost:5173' },
    globalSetup: ['./tests/global-setup.ts'],
  },
})
