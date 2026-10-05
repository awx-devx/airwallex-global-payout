import { subtractMoney, type Balance, type RunAction, type RunFlags } from '@/contracts'
import { formatMoney } from '@/ui/format/money'

export function payDisabledSentence(input: {
  allowedActions: readonly RunAction[]
  flags: Pick<RunFlags, 'approvalHold' | 'insufficientBalance' | 'needsAttention' | 'quoteExpired'>
  totalPayerPays: string | null
  sourceCurrency: string
  balance: Balance | null
}): string | null {
  if (input.allowedActions.includes('pay')) return null
  if (input.flags.approvalHold) {
    return 'Waiting for approval in Airwallex. This demo cannot approve it.'
  }
  if (input.flags.insufficientBalance && input.balance && input.totalPayerPays) {
    const delta = subtractMoney(input.totalPayerPays, input.balance.available, input.sourceCurrency)
    return `${input.sourceCurrency} wallet is short by ${formatMoney(input.sourceCurrency, delta)}.`
  }
  if (input.flags.needsAttention) return 'Exclude the rows with errors first.'
  if (input.flags.quoteExpired) return 'Quote expired.'
  return null
}
