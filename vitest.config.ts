import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Memory Mongo starts in globalSetup. setupFiles injects that URI.
    // Do not load .env. pnpm test must not use the developer's database.
    globalSetup: ['./src/server/test/global-setup.ts'],
    setupFiles: ['./src/server/test/setup.ts'],
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
})
