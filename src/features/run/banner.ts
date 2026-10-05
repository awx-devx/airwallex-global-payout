import { subtractMoney, type RunDetail } from '@/contracts'
import { formatMoney } from '@/ui/format/money'
import type { BannerTone } from '@/ui/primitives/banner'

export function runBanner(run: RunDetail): { tone: BannerTone; message: string } | null {
  if (run.error?.message) return { tone: 'down', message: run.error.message }
  if (run.flags.approvalHold) {
    return {
      tone: 'warn',
      message: 'Waiting for approval in Airwallex. This demo cannot approve it.',
    }
  }
  if (run.flags.insufficientBalance && run.balance && run.totalPayerPays) {
    const delta = subtractMoney(run.totalPayerPays, run.balance.available, run.sourceCurrency)
    return {
      tone: 'warn',
      message: `${run.sourceCurrency} wallet is short by ${formatMoney(run.sourceCurrency, delta)}.`,
    }
  }
  if (run.flags.needsAttention) {
    return { tone: 'warn', message: 'Exclude the rows with errors first.' }
  }
  return null
}
