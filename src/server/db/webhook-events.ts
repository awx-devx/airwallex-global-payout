import { connectDb } from '@/server/db/connect'
import { WebhookEventModel } from '@/server/db/webhook-event-model'

export async function insertWebhookEvent(eventId: string): Promise<'inserted' | 'duplicate'> {
  await connectDb()
  try {
    await WebhookEventModel.create({ _id: eventId })
    return 'inserted'
  } catch (error) {
    if (isDuplicateKey(error)) return 'duplicate'
    throw error
  }
}

function isDuplicateKey(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  if ('code' in error && (error as { code: unknown }).code === 11000) return true
  if ('cause' in error) return isDuplicateKey((error as { cause: unknown }).cause)
  return false
}
