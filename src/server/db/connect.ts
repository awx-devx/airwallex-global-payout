import mongoose from 'mongoose'
import { getServerEnv } from '@/server/env'
import { RunModel } from '@/server/db/run-model'
import { WebhookEventModel } from '@/server/db/webhook-event-model'

mongoose.set('strictQuery', true)

type MongooseCache = {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

const globalForMongoose = globalThis as typeof globalThis & {
  __payoutMongoose?: MongooseCache
}

function cache(): MongooseCache {
  globalForMongoose.__payoutMongoose ??= { conn: null, promise: null }
  return globalForMongoose.__payoutMongoose
}

export async function connectDb(): Promise<typeof mongoose> {
  const slot = cache()
  if (slot.conn?.connection.readyState === 1) return slot.conn

  if (!slot.promise) {
    const { MONGODB_URI } = getServerEnv()
    slot.promise = mongoose
      .connect(MONGODB_URI, { serverSelectionTimeoutMS: 5_000 })
      .then(async (connected) => {
        await Promise.all([RunModel.init(), WebhookEventModel.init()])
        slot.conn = connected
        return connected
      })
      .catch((error: unknown) => {
        slot.promise = null
        slot.conn = null
        throw error
      })
  }

  return slot.promise
}

export async function disconnectDb(): Promise<void> {
  const slot = cache()
  slot.conn = null
  slot.promise = null
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
}
