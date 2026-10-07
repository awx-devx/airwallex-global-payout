import { describe, expect, it } from 'vitest'
import { ContractError } from '@/contracts'
import { payFailure } from './pay-error'

describe('payFailure', () => {
  it('refetches when the pay bar has to explain the block', () => {
    expect(
      payFailure(
        new ContractError(409, 'QUOTE_EXPIRED', 'The quote expired. Refresh it before paying.'),
      ),
    ).toBe('refetch')
    expect(
      payFailure(
        new ContractError(409, 'INSUFFICIENT_BALANCE', 'The wallet does not cover this quote.'),
      ),
    ).toBe('refetch')
  })

  it('toasts an Airwallex failure and does not treat it as a new run', () => {
    expect(
      payFailure(new ContractError(502, 'AIRWALLEX_ERROR', 'The batch could not be booked.')),
    ).toBe('toast')
  })

  it('ignores anything that is not one of those envelopes', () => {
    expect(
      payFailure(new ContractError(409, 'INVALID_STATE', 'Pay is not available on this run.')),
    ).toBe(null)
    expect(payFailure(new Error('network'))).toBeNull()
  })
})
