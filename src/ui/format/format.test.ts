import { describe, expect, it } from 'vitest'
import { formatCountdown } from './countdown'
import { formatMoney, savingsTone } from './money'

const NOW = new Date('2026-04-02T18:00:00.000Z')

function at(seconds: number): string {
  return new Date(NOW.getTime() + seconds * 1000).toISOString()
}

describe('formatMoney', () => {
  it('groups thousands and keeps payout precision', () => {
    expect(formatMoney('USD', '4200')).toBe('USD 4,200.00')
    expect(formatMoney('INR', '185000')).toBe('INR 185,000.00')
    expect(formatMoney('JPY', '240000')).toBe('JPY 240,000')
    expect(formatMoney('BHD', '1.234')).toBe('BHD 1.234')
  })

  it('prefixes a plus only when signed and greater than zero', () => {
    expect(formatMoney('USD', '15', { signed: true })).toBe('+USD 15.00')
    expect(formatMoney('USD', '0', { signed: true })).toBe('USD 0.00')
    expect(formatMoney('USD', '0.00')).toBe('USD 0.00')
  })

  it('renders a dash when the amount is null', () => {
    expect(formatMoney('USD', null)).toBe('—')
    expect(formatMoney('USD', null, { signed: true })).toBe('—')
  })
})

describe('savingsTone', () => {
  it('uses up, same price, and only rail', () => {
    expect(savingsTone('15.00', 'USD')).toEqual({ tone: 'up', text: '+USD 15.00' })
    expect(savingsTone('0.00', 'USD')).toEqual({ tone: 'muted', text: 'Same price' })
    expect(savingsTone(null, 'USD')).toEqual({ tone: 'only', text: 'Only rail' })
  })
})

describe('formatCountdown', () => {
  it('counts minutes, seconds, and expiry', () => {
    expect(formatCountdown(at(58 * 60 + 12), NOW)).toBe('58:12')
    expect(formatCountdown(at(45), NOW)).toBe('45s')
    expect(formatCountdown(at(0), NOW)).toBe('Expired')
    expect(formatCountdown(at(-1), NOW)).toBe('Expired')
  })
})
