import type { RailQuote, RowPricing, TransferMethod } from './schemas'
import { parseMoney, subtractMoney } from './currencies'

const LOCAL_LABELS: Record<string, string> = {
  ACH: 'ACH',
  FASTER_PAYMENTS: 'Faster Payments',
  BANK_TRANSFER: 'Bank transfer',
  FAST: 'FAST',
  GIRO: 'GIRO',
  NPP: 'NPP',
  FEDWIRE: 'Fedwire',
  FEDNOW: 'FedNow',
  CHAPS: 'CHAPS',
}

export function railLabel(
  method: TransferMethod,
  system: string | null,
  currency: string,
): string {
  if (method === 'SWIFT') return 'SWIFT'
  if (system == null || system === '') {
    return currency === 'EUR' ? 'SEPA' : 'Local'
  }
  return LOCAL_LABELS[system] ?? system
}

/**
 * Lowest amountPayerPays wins. Ties break on lower feeAmount, then LOCAL before SWIFT.
 * savings is the single alternative minus the winner, in the source currency.
 * Equal prices produce "0.00", not null. Null means there was no alternative.
 */
export function selectCheapestRail(quotes: readonly RailQuote[]): RowPricing {
  if (quotes.length === 0) {
    return { chosen: null, alternatives: [], savings: null }
  }

  const ranked = [...quotes].sort((left, right) => {
    const pays = parseMoney(left.amountPayerPays).comparedTo(parseMoney(right.amountPayerPays))
    if (pays !== 0 && pays != null) return pays
    const fee = parseMoney(left.feeAmount).comparedTo(parseMoney(right.feeAmount))
    if (fee !== 0 && fee != null) return fee
    if (left.transferMethod === right.transferMethod) return 0
    return left.transferMethod === 'LOCAL' ? -1 : 1
  })

  const chosen = ranked[0]
  if (!chosen) {
    return { chosen: null, alternatives: [], savings: null }
  }

  const alternatives = ranked.slice(1)
  const alternative = alternatives[0]
  const savings =
    alternatives.length === 0 || !alternative
      ? null
      : subtractMoney(alternative.amountPayerPays, chosen.amountPayerPays, chosen.sourceCurrency)

  return { chosen, alternatives, savings }
}
