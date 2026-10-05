import { describe, expect, it } from 'vitest'
import { railLabel, selectCheapestRail } from './rails'
import type { RailQuote } from './schemas'

function quote(overrides: Partial<RailQuote> & Pick<RailQuote, 'transferMethod' | 'amountPayerPays' | 'feeAmount'>): RailQuote {
  return {
    localClearingSystem: null,
    railLabel: overrides.transferMethod,
    amountBeneficiaryReceives: '10.00',
    sourceCurrency: 'USD',
    transferCurrency: 'USD',
    feeCurrency: 'USD',
    ...overrides,
  }
}

describe('railLabel', () => {
  it('names the demo clearing systems and the SWIFT and SEPA fallbacks', () => {
    expect(railLabel('LOCAL', 'ACH', 'USD')).toBe('ACH')
    expect(railLabel('LOCAL', 'FASTER_PAYMENTS', 'GBP')).toBe('Faster Payments')
    expect(railLabel('LOCAL', 'BANK_TRANSFER', 'AUD')).toBe('Bank transfer')
    expect(railLabel('LOCAL', 'FAST', 'SGD')).toBe('FAST')
    expect(railLabel('LOCAL', 'GIRO', 'SGD')).toBe('GIRO')
    expect(railLabel('LOCAL', 'NPP', 'AUD')).toBe('NPP')
    expect(railLabel('LOCAL', 'FEDWIRE', 'USD')).toBe('Fedwire')
    expect(railLabel('LOCAL', 'FEDNOW', 'USD')).toBe('FedNow')
    expect(railLabel('LOCAL', 'CHAPS', 'GBP')).toBe('CHAPS')
    expect(railLabel('LOCAL', null, 'EUR')).toBe('SEPA')
    expect(railLabel('LOCAL', null, 'INR')).toBe('Local')
    expect(railLabel('LOCAL', 'NEFT', 'INR')).toBe('NEFT')
    expect(railLabel('SWIFT', 'ACH', 'USD')).toBe('SWIFT')
  })
})

describe('selectCheapestRail', () => {
  it('keeps the lower payer amount and records savings against the loser', () => {
    const pricing = selectCheapestRail([
      quote({ transferMethod: 'SWIFT', amountPayerPays: '4215.00', feeAmount: '15.00' }),
      quote({ transferMethod: 'LOCAL', localClearingSystem: 'ACH', amountPayerPays: '4200.00', feeAmount: '0.00' }),
    ])
    expect(pricing.chosen?.transferMethod).toBe('LOCAL')
    expect(pricing.alternatives).toHaveLength(1)
    expect(pricing.savings).toBe('15.00')
  })

  it('breaks ties on fee, then prefers LOCAL, and writes 0.00 when the price matches', () => {
    const byFee = selectCheapestRail([
      quote({ transferMethod: 'SWIFT', amountPayerPays: '10.00', feeAmount: '1.00' }),
      quote({ transferMethod: 'LOCAL', amountPayerPays: '10.00', feeAmount: '0.00' }),
    ])
    expect(byFee.chosen?.transferMethod).toBe('LOCAL')
    expect(byFee.savings).toBe('0.00')

    const byMethod = selectCheapestRail([
      quote({ transferMethod: 'SWIFT', amountPayerPays: '10.00', feeAmount: '1.00' }),
      quote({ transferMethod: 'LOCAL', amountPayerPays: '10.00', feeAmount: '1.00' }),
    ])
    expect(byMethod.chosen?.transferMethod).toBe('LOCAL')
  })

  it('returns null savings when only one rail was priced', () => {
    const pricing = selectCheapestRail([
      quote({ transferMethod: 'LOCAL', amountPayerPays: '2220.00', feeAmount: '0.00', transferCurrency: 'INR' }),
    ])
    expect(pricing.alternatives).toEqual([])
    expect(pricing.savings).toBeNull()
  })
})
