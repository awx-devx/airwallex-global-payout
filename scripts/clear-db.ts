import path from 'node:path'
import { it } from 'vitest'
import { connectDb, disconnectDb } from '@/server/db/connect'
import { RunModel } from '@/server/db/run-model'
import { WebhookEventModel } from '@/server/db/webhook-event-model'
import { loadEnvFile } from '@/server/env-file'

// DEMO-ONLY: deletes every run and webhook event in the configured Mongo database.
// PROD: do not point this at a live database. Airwallex transfers are left as they are.

loadEnvFile(path.resolve('.env'))

it('clears runs and webhook events', async () => {
  const db = await connectDb()
  const [runs, events] = await Promise.all([
    RunModel.deleteMany({}),
    WebhookEventModel.deleteMany({}),
  ])
  console.log(
    `Cleared ${db.connection.name}: ${runs.deletedCount} runs, ${events.deletedCount} webhook events.`,
  )
  await disconnectDb()
})
