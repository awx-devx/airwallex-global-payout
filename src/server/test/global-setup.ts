import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { mongoUriFile } from './mongo-uri-file'

// Vitest starts this process before any test file. It does not read .env.
export default async function setup(): Promise<() => Promise<void>> {
  const server = await MongoMemoryServer.create({
    binary: { version: '7.0.14' },
  })
  mkdirSync(path.dirname(mongoUriFile), { recursive: true })
  writeFileSync(mongoUriFile, server.getUri('globalpayout'))

  return async () => {
    await server.stop({ doCleanup: true, force: true })
    rmSync(mongoUriFile, { force: true })
  }
}
