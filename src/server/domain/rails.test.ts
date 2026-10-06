import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import type { RailQuote, TransferMethod } from '@/contracts'
import { parseMoney } from '@/contracts'
import { pickCheapestRail, probeMethods } from '@/server/domain/rails'

function quote(method: TransferMethod, amountPayerPays: string, feeAmount: string): RailQuote {
  return {
    transferMethod: method,
    localClearingSystem: null,
    railLabel: method,
    amountPayerPays,
    feeAmount,
    feeCurrency: 'USD',
    amountBeneficiaryReceives: '10.00',
    sourceCurrency: 'USD',
    transferCurrency: 'USD',
  }
}

describe('probeMethods', () => {
  it('omits SWIFT for INR and offers both rails otherwise', () => {
    expect(probeMethods('INR')).toEqual(['LOCAL'])
    expect(probeMethods('USD')).toEqual(['LOCAL', 'SWIFT'])
    expect(probeMethods('GBP')).toEqual(['LOCAL', 'SWIFT'])
  })
})

describe('pickCheapestRail', () => {
  it('keeps the quote whose amountPayerPays is the minimum', () => {
    const random = mulberry32(0x5eed)
    for (let index = 0; index < 40; index += 1) {
      const local = money(random)
      const swift = money(random)
      const localFee = money(random)
      const swiftFee = money(random)
      const pricing = pickCheapestRail([
        quote('SWIFT', swift, swiftFee),
        quote('LOCAL', local, localFee),
      ])
      const chosen = pricing.chosen
      if (!chosen) throw new Error('expected a winner')
      const pays = parseMoney(chosen.amountPayerPays)
      expect(pays.lte(parseMoney(local))).toBe(true)
      expect(pays.lte(parseMoney(swift))).toBe(true)
    }
  })

  it('breaks an equal price on fee, then prefers LOCAL', () => {
    const byFee = pickCheapestRail([
      quote('SWIFT', '10.00', '2.00'),
      quote('LOCAL', '10.00', '1.00'),
    ])
    expect(byFee.chosen?.transferMethod).toBe('LOCAL')
    expect(byFee.savings).toBe('0.00')

    const byMethod = pickCheapestRail([
      quote('SWIFT', '10.00', '1.00'),
      quote('LOCAL', '10.00', '1.00'),
    ])
    expect(byMethod.chosen?.transferMethod).toBe('LOCAL')
  })
})

function money(random: () => number): string {
  const cents = Math.floor(random() * 500_000)
  return new Decimal(cents).div(100).toFixed(2)
}

function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let next = Math.imul(state ^ (state >>> 15), 1 | state)
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}
