import { describe, expect, it } from 'vitest'
import { payDisabledSentence } from './pay-sentence'

const flags = {
  approvalHold: false,
  insufficientBalance: false,
  needsAttention: false,
  quoteExpired: false,
}

describe('payDisabledSentence', () => {
  it('stays quiet when pay is allowed', () => {
    expect(
      payDisabledSentence({
        allowedActions: ['pay', 'discard'],
        flags,
        totalPayerPays: '189.60',
        sourceCurrency: 'USD',
        balance: { currency: 'USD', available: '50000.00', pending: '0.00' },
      }),
    ).toBeNull()
  })

  it('explains attention, expiry, a short wallet, and approval', () => {
    expect(
      payDisabledSentence({
        allowedActions: ['discard'],
        flags: { ...flags, needsAttention: true },
        totalPayerPays: '189.60',
        sourceCurrency: 'USD',
        balance: null,
      }),
    ).toBe('Exclude the rows with errors first.')
    expect(
      payDisabledSentence({
        allowedActions: ['requote', 'discard'],
        flags: { ...flags, quoteExpired: true },
        totalPayerPays: '189.60',
        sourceCurrency: 'USD',
        balance: null,
      }),
    ).toBe('Quote expired.')
    expect(
      payDisabledSentence({
        allowedActions: ['discard'],
        flags: { ...flags, insufficientBalance: true },
        totalPayerPays: '189.60',
        sourceCurrency: 'USD',
        balance: { currency: 'USD', available: '100.00', pending: '0.00' },
      }),
    ).toBe('USD wallet is short by USD 89.60.')
    expect(
      payDisabledSentence({
        allowedActions: ['advance'],
        flags: { ...flags, approvalHold: true },
        totalPayerPays: '189.60',
        sourceCurrency: 'USD',
        balance: null,
      }),
    ).toBe('Waiting for approval in Airwallex. This demo cannot approve it.')
  })
})
