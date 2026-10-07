import { describe, expect, it } from 'vitest'
import { POST } from '@/app/api/webhooks/airwallex/route'

describe('webhook route', () => {
  it('returns 400 when the signature is missing', async () => {
    const response = await POST(
      new Request('http://localhost/api/webhooks/airwallex', {
        method: 'POST',
        body: '{"id":"evt_route","name":"payout.transfer.paid"}',
      }),
    )
    expect(response.status).toBe(400)
  })
})
