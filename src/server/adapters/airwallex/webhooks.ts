import { createHmac, timingSafeEqual } from 'node:crypto'
import { insertWebhookEvent } from '@/server/db/webhook-events'

const TOLERANCE_MS = 5 * 60 * 1000

export function verifyWebhookSignature(input: {
  secret: string
  timestamp: string
  rawBody: string
  signature: string
  now?: number
}): boolean {
  if (!freshTimestamp(input.timestamp, input.now ?? Date.now())) return false
  const digest = createHmac('sha256', input.secret)
    .update(`${input.timestamp}${input.rawBody}`)
    .digest()
  const given = Buffer.from(input.signature, 'hex')
  if (given.length !== digest.length) return false
  return timingSafeEqual(given, digest)
}

export function recordWebhookEvent(eventId: string): Promise<'inserted' | 'duplicate'> {
  return insertWebhookEvent(eventId)
}

function freshTimestamp(timestamp: string, now: number): boolean {
  if (!/^\d+$/.test(timestamp)) return false
  const value = Number(timestamp)
  const millis = timestamp.length >= 13 ? value : value * 1_000
  return Math.abs(now - millis) <= TOLERANCE_MS
}
