import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { recordWebhookEvent, verifyWebhookSignature } from '@/server/adapters/airwallex/webhooks'

const SECRET = 'whsec_test'
const NOW = Date.parse('2026-04-02T18:00:00.000Z')

function sign(timestamp: string, rawBody: string): string {
  return createHmac('sha256', SECRET).update(`${timestamp}${rawBody}`).digest('hex')
}

describe('webhook signature', () => {
  it('rejects a tampered body and an old timestamp', () => {
    const timestamp = String(NOW)
    const rawBody = '{"id":"evt_1"}'
    const signature = sign(timestamp, rawBody)
    expect(
      verifyWebhookSignature({ secret: SECRET, timestamp, rawBody, signature, now: NOW }),
    ).toBe(true)
    expect(
      verifyWebhookSignature({
        secret: SECRET,
        timestamp,
        rawBody: `${rawBody} `,
        signature,
        now: NOW,
      }),
    ).toBe(false)
    expect(
      verifyWebhookSignature({
        secret: SECRET,
        timestamp: String(NOW - 6 * 60 * 1000),
        rawBody,
        signature: sign(String(NOW - 6 * 60 * 1000), rawBody),
        now: NOW,
      }),
    ).toBe(false)
  })

  it('treats a duplicate event id as a no-op', async () => {
    const eventId = `evt_${crypto.randomUUID()}`
    expect(await recordWebhookEvent(eventId)).toBe('inserted')
    expect(await recordWebhookEvent(eventId)).toBe('duplicate')
  })
})
