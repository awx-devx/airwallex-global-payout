import type { RailQuote, RowPricing, TransferMethod } from '@/contracts'
import { selectCheapestRail } from '@/contracts'

/** INR has no SWIFT probe. Every other demo currency gets local and SWIFT. */
export function probeMethods(currency: string): readonly TransferMethod[] {
  if (currency === 'INR') return ['LOCAL']
  return ['LOCAL', 'SWIFT']
}

export function pickCheapestRail(quotes: readonly RailQuote[]): RowPricing {
  return selectCheapestRail(quotes)
}
