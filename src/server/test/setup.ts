import { readFileSync } from 'node:fs'
import { afterAll } from 'vitest'
import { mongoUriFile } from './mongo-uri-file'

const uri = readFileSync(mongoUriFile, 'utf8').trim()
if (!uri.startsWith('mongodb://')) {
  throw new Error('Vitest did not receive a mongodb-memory-server URI')
}

process.env.MONGODB_URI = uri
process.env.PAYMENTS_GATEWAY = 'mock'
process.env.NEXT_PUBLIC_DATA_SOURCE = 'mock'

afterAll(async () => {
  const { disconnectDb } = await import('@/server/db/connect')
  await disconnectDb()
})
