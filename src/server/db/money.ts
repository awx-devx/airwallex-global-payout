import { MoneyStringSchema } from '@/contracts'
import mongoose from 'mongoose'

export function toDecimal128(value: string): mongoose.Types.Decimal128 {
  const parsed = MoneyStringSchema.safeParse(value)
  if (!parsed.success) throw new Error(`Invalid money string: ${value}`)
  return mongoose.Types.Decimal128.fromString(parsed.data)
}

export function toDecimal128OrNull(value: string | null): mongoose.Types.Decimal128 | null {
  return value === null ? null : toDecimal128(value)
}

export function fromDecimal128(value: unknown): string {
  const text = decimalText(value)
  const parsed = MoneyStringSchema.safeParse(text)
  if (!parsed.success) throw new Error(`Decimal128 round-trip produced ${text}`)
  return parsed.data
}

export function fromDecimal128OrNull(value: unknown): string | null {
  if (value == null) return null
  return fromDecimal128(value)
}

function decimalText(value: unknown): string {
  if (typeof value === 'string') return value
  if (isDecimal128(value)) return value.toString()
  throw new Error('Expected Decimal128')
}

function isDecimal128(value: unknown): value is { toString(): string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_bsontype' in value &&
    (value as { _bsontype?: unknown })._bsontype === 'Decimal128'
  )
}
