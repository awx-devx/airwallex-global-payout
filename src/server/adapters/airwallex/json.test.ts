import { describe, expect, it } from 'vitest'
import { parseJsonLossless, quoteJsonNumbers } from '@/server/adapters/airwallex/json'

describe('lossless JSON', () => {
  it('keeps decimal tokens exact, including inside nested objects', () => {
    const text = '{"amount_payer_pays":18960.10,"nested":{"fee":0.10},"ok":true,"note":"room 12"}'
    expect(quoteJsonNumbers(text)).toContain('"18960.10"')
    expect(quoteJsonNumbers(text)).toContain('"room 12"')
    const parsed = parseJsonLossless(text) as {
      amount_payer_pays: string
      nested: { fee: string }
      ok: boolean
      note: string
    }
    expect(parsed.amount_payer_pays).toBe('18960.10')
    expect(parsed.nested.fee).toBe('0.10')
    expect(parsed.ok).toBe(true)
    expect(parsed.note).toBe('room 12')
  })
})
