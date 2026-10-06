import { Schema } from 'mongoose'
import { registerModel } from '@/server/db/register-model'

const webhookEventSchema = new Schema(
  {
    _id: { type: String, required: true },
  },
  { collection: 'webhook_events', versionKey: false },
)

export const WebhookEventModel = registerModel('WebhookEvent', webhookEventSchema)
