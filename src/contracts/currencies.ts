import Decimal from 'decimal.js'

/**
 * Payout decimal places.
 * AIRWALLEX: this is the payout precision table, not ISO 4217 and not the payments currency list.
 * KES and SAR are 0 dp. HUF and IDR are 2 dp.
 * https://www.airwallex.com/docs/payouts/how-airwallex-payouts-work/currency-precision.md
 */
const PAYOUT_PRECISION = {
  AED: 2,
  ALL: 2,
  AMD: 2,
  AOA: 2,
  ARS: 2,
  AUD: 2,
  AZN: 2,
  BAM: 2,
  BBD: 2,
  BDT: 2,
  BGN: 2,
  BHD: 3,
  BOB: 2,
  BRL: 2,
  BSD: 2,
  BWP: 2,
  BZD: 2,
  CAD: 2,
  CHF: 2,
  CLP: 0,
  CNY: 2,
  COP: 2,
  CRC: 2,
  CZK: 2,
  DKK: 2,
  DOP: 2,
  DZD: 2,
  EGP: 2,
  EUR: 2,
  FJD: 2,
  GBP: 2,
  GEL: 2,
  GHS: 2,
  GMD: 2,
  GTQ: 2,
  GYD: 2,
  HKD: 2,
  HNL: 2,
  HUF: 2,
  IDR: 2,
  ILS: 2,
  INR: 2,
  ISK: 0,
  JMD: 2,
  JOD: 3,
  JPY: 0,
  KES: 0,
  KGS: 2,
  KRW: 0,
  KWD: 3,
  KZT: 2,
  LKR: 2,
  LSL: 2,
  MAD: 2,
  MGA: 2,
  MUR: 2,
  MWK: 2,
  MXN: 2,
  MYR: 2,
  NAD: 2,
  NGN: 2,
  NIO: 2,
  NOK: 2,
  NPR: 2,
  NZD: 2,
  OMR: 3,
  PEN: 2,
  PHP: 2,
  PKR: 2,
  PLN: 2,
  PYG: 0,
  QAR: 2,
  RON: 2,
  RSD: 2,
  RWF: 0,
  SAR: 0,
  SCR: 2,
  SEK: 2,
  SGD: 2,
  THB: 2,
  TND: 3,
  TRY: 2,
  TTD: 2,
  TZS: 2,
  USD: 2,
  UYU: 2,
  VND: 0,
  XAF: 0,
  XOF: 0,
  ZAR: 2,
  ZMW: 2,
} as const satisfies Record<string, 0 | 2 | 3>

export type PayoutCurrency = keyof typeof PAYOUT_PRECISION

const MONEY_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/

export const PAYOUT_CURRENCIES = Object.keys(PAYOUT_PRECISION)

export function isPayoutCurrency(currency: string): currency is PayoutCurrency {
  return Object.prototype.hasOwnProperty.call(PAYOUT_PRECISION, currency)
}

export function payoutPrecision(currency: string): number {
  if (!isPayoutCurrency(currency)) {
    throw new Error(`Unknown payout currency: ${currency}`)
  }
  return PAYOUT_PRECISION[currency]
}

/** Decimal string rounded half-up to the currency's payout precision. */
export function toMoneyString(value: Decimal, currency: string): string {
  const places = payoutPrecision(currency)
  return value.toDecimalPlaces(places, Decimal.ROUND_HALF_UP).toFixed(places)
}

export function parseMoney(value: string): Decimal {
  if (!MONEY_PATTERN.test(value)) {
    throw new Error(`Invalid money string: ${value}`)
  }
  return new Decimal(value)
}

export function sumMoney(amounts: readonly string[], currency: string): string {
  const total = amounts.reduce((sum, amount) => sum.plus(parseMoney(amount)), new Decimal(0))
  return toMoneyString(total, currency)
}

export function subtractMoney(amount: string, minus: string, currency: string): string {
  return toMoneyString(parseMoney(amount).minus(parseMoney(minus)), currency)
}
