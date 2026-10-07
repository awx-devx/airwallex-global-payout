import { spawn } from 'node:child_process'
import { MongoMemoryServer } from 'mongodb-memory-server'

const mongo = await MongoMemoryServer.create({
  binary: { version: '7.0.14' },
})

const child = spawn('pnpm', ['exec', 'next', 'dev', '--port', '3101'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    MONGODB_URI: mongo.getUri('globalpayout'),
    DEMO_MODE: 'true',
    NEXT_PUBLIC_DATA_SOURCE: 'api',
    PAYMENTS_GATEWAY: 'mock',
    SOURCE_CURRENCY: 'USD',
  },
})

let stopping = false

async function stop(signal) {
  if (stopping) return
  stopping = true
  child.kill(signal)
  await mongo.stop({ doCleanup: true, force: true })
}

process.on('SIGTERM', () => {
  void stop('SIGTERM').then(() => process.exit(0))
})
process.on('SIGINT', () => {
  void stop('SIGINT').then(() => process.exit(0))
})

child.on('exit', (code) => {
  if (stopping) return
  void mongo.stop({ doCleanup: true, force: true }).finally(() => process.exit(code ?? 0))
})
