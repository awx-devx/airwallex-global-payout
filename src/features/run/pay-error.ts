import { ContractError } from '@/contracts'

export type PayFailure = 'refetch' | 'toast'

/** What the run page does when pay rejects. Success is the only path that replaces the run. */
export function payFailure(error: unknown): PayFailure | null {
  if (!(error instanceof ContractError)) return null
  if (error.code === 'QUOTE_EXPIRED' || error.code === 'INSUFFICIENT_BALANCE') return 'refetch'
  if (error.code === 'AIRWALLEX_ERROR') return 'toast'
  return null
}
