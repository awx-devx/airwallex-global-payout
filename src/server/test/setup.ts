import { readFileSync } from 'node:fs'
import { afterAll } from 'vitest'
import { logger } from '@/server/logger'
import { mongoUriFile } from './mongo-uri-file'

const uri = readFileSync(mongoUriFile, 'utf8').trim()
if (!uri.startsWith('mongodb://')) {
  throw new Error('Vitest did not receive a mongodb-memory-server URI')
}

const pool = process.env.VITEST_POOL_ID ?? '0'
process.env.MONGODB_URI = uri.replace(/\/globalpayout(?=$|\?)/, `/globalpayout_${pool}`)
process.env.PAYMENTS_GATEWAY = 'mock'
process.env.NEXT_PUBLIC_DATA_SOURCE = 'mock'
logger.level = 'silent'

afterAll(async () => {
  const { disconnectDb } = await import('@/server/db/connect')
  await disconnectDb()
})
