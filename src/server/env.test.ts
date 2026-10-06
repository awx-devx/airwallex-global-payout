import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { register } from '@/instrumentation'
import { getServerEnv, parseServerEnv } from '@/server/env'

const ARCHITECTURE_ENV = [
  'AIRWALLEX_CLIENT_ID',
  'AIRWALLEX_API_KEY',
  'AIRWALLEX_BASE_URL',
  'AIRWALLEX_API_VERSION',
  'AIRWALLEX_ENV',
  'AIRWALLEX_WEBHOOK_SECRET',
  'MONGODB_URI',
  'SOURCE_CURRENCY',
  'DEMO_MODE',
  'NEXT_PUBLIC_DATA_SOURCE',
  'PAYMENTS_GATEWAY',
] as const

function readExampleEnv(): Record<string, string> {
  const text = readFileSync(path.join(process.cwd(), '.env.example'), 'utf8')
  const env: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    env[key] = trimmed
      .slice(eq + 1)
      .replace(/\s+#.*$/, '')
      .trim()
  }
  return env
}

describe('server env', () => {
  it('fails boot when MONGODB_URI is missing', async () => {
    expect(() => parseServerEnv({})).toThrow(/MONGODB_URI/)

    const uri = process.env.MONGODB_URI
    delete process.env.MONGODB_URI
    process.env.NEXT_RUNTIME = 'nodejs'
    try {
      await expect(register()).rejects.toThrow(/MONGODB_URI/)
    } finally {
      if (uri === undefined) delete process.env.MONGODB_URI
      else process.env.MONGODB_URI = uri
      delete process.env.NEXT_RUNTIME
    }
  })

  it('accepts .env.example for the mock gateway', () => {
    const example = readExampleEnv()
    for (const key of ARCHITECTURE_ENV) expect(example).toHaveProperty(key)

    const env = parseServerEnv(example)
    expect(env).toMatchObject({
      MONGODB_URI: 'mongodb://localhost:27017/globalpayout?replicaSet=rs0&directConnection=true',
      SOURCE_CURRENCY: 'USD',
      DEMO_MODE: 'true',
      NEXT_PUBLIC_DATA_SOURCE: 'mock',
      PAYMENTS_GATEWAY: 'mock',
      AIRWALLEX_ENV: 'sandbox',
      AIRWALLEX_BASE_URL: 'https://api.sandbox.airwallex.com',
      AIRWALLEX_API_VERSION: '2026-08-21',
    })
    expect(env.AIRWALLEX_CLIENT_ID).toBeUndefined()
    expect(env.AIRWALLEX_API_KEY).toBeUndefined()
    expect(env.AIRWALLEX_WEBHOOK_SECRET).toBeUndefined()
  })

  it('defaults the mock gateway and requires Airwallex keys only for the live gateway', () => {
    const env = parseServerEnv({ MONGODB_URI: 'mongodb://127.0.0.1:27017/globalpayout' })
    expect(env.PAYMENTS_GATEWAY).toBe('mock')
    expect(env.SOURCE_CURRENCY).toBe('USD')
    expect(env.DEMO_MODE).toBe('false')
    expect(env.NEXT_PUBLIC_DATA_SOURCE).toBe('mock')
    expect(env.AIRWALLEX_ENV).toBe('sandbox')

    expect(() =>
      parseServerEnv({
        MONGODB_URI: 'mongodb://127.0.0.1:27017/globalpayout',
        PAYMENTS_GATEWAY: 'airwallex',
      }),
    ).toThrow(/AIRWALLEX_API_KEY/)

    const live = parseServerEnv({
      MONGODB_URI: 'mongodb+srv://example.mongodb.net/globalpayout',
      PAYMENTS_GATEWAY: 'airwallex',
      AIRWALLEX_CLIENT_ID: 'client',
      AIRWALLEX_API_KEY: 'key',
    })
    expect(live.PAYMENTS_GATEWAY).toBe('airwallex')
    expect(live.AIRWALLEX_API_KEY).toBe('key')
  })

  it('uses the memory server URI injected by Vitest', () => {
    const env = getServerEnv()
    expect(env.MONGODB_URI).toMatch(/^mongodb:\/\/127\.0\.0\.1:\d+\/globalpayout/)
    expect(env.MONGODB_URI).not.toContain('replicaSet=rs0')
    expect(env.PAYMENTS_GATEWAY).toBe('mock')
  })
})
