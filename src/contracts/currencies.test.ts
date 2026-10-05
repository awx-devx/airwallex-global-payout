import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { PAYOUT_CURRENCIES, payoutPrecision, subtractMoney, sumMoney, toMoneyString } from './currencies'

describe('payout precision', () => {
  it('formats USD, INR, JPY, and BHD at the Airwallex payout precision', () => {
    expect(payoutPrecision('USD')).toBe(2)
    expect(payoutPrecision('INR')).toBe(2)
    expect(payoutPrecision('JPY')).toBe(0)
    expect(payoutPrecision('BHD')).toBe(3)

    expect(toMoneyString(new Decimal('4200'), 'USD')).toBe('4200.00')
    expect(toMoneyString(new Decimal('185000.4'), 'INR')).toBe('185000.40')
    expect(toMoneyString(new Decimal('240000.5'), 'JPY')).toBe('240001')
    expect(toMoneyString(new Decimal('1.2345'), 'BHD')).toBe('1.235')
  })

  it('keeps KES and SAR at 0 dp and the other 3 dp codes', () => {
    expect(payoutPrecision('KES')).toBe(0)
    expect(payoutPrecision('SAR')).toBe(0)
    for (const currency of ['BHD', 'JOD', 'KWD', 'OMR', 'TND']) {
      expect(payoutPrecision(currency)).toBe(3)
    }
  })

  it('lists the payout currencies from the Airwallex table', () => {
    expect(PAYOUT_CURRENCIES).toHaveLength(91)
    expect(payoutPrecision('EUR')).toBe(2)
  })

  it('rejects an unknown currency and sums with decimal.js', () => {
    expect(() => payoutPrecision('XXX')).toThrow(/Unknown payout currency/)
    expect(sumMoney(['0.10', '0.20'], 'USD')).toBe('0.30')
    expect(subtractMoney('4.00', '4.00', 'USD')).toBe('0.00')
  })
})
