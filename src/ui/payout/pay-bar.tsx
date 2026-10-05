import type { Balance, RunAction, RunFlags } from '@/contracts'
import { formatMoney } from '@/ui/format/money'
import { Button, type ButtonVariant } from '@/ui/primitives/button'
import { Money } from './money'
import { payDisabledSentence } from './pay-sentence'

const actionOrder = ['pay', 'requote', 'advance', 'discard'] as const

const actionVariant: Record<(typeof actionOrder)[number], ButtonVariant> = {
  pay: 'primary',
  requote: 'secondary',
  advance: 'secondary',
  discard: 'ghost',
}

export function PayBar({
  includedCount,
  totalPayerPays,
  sourceCurrency,
  allowedActions,
  flags,
  balance,
  onAction,
}: {
  includedCount: number
  totalPayerPays: string | null
  sourceCurrency: string
  allowedActions: readonly RunAction[]
  flags: RunFlags
  balance: Balance | null
  onAction?: (action: RunAction) => void
}) {
  const sentence = payDisabledSentence({
    allowedActions,
    flags,
    totalPayerPays,
    sourceCurrency,
    balance,
  })
  const actions = actionOrder.filter((action) => allowedActions.includes(action))

  return (
    <div className="grid gap-3 border border-[var(--line-1)] bg-[var(--bg-1)] px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Money currency={sourceCurrency} value={totalPayerPays} size="bar" />
        <div className="flex flex-wrap items-center gap-3">
          {actions.map((action) => (
            <Button
              key={action}
              variant={actionVariant[action]}
              onClick={onAction ? () => onAction(action) : undefined}
            >
              {actionLabel(action, includedCount, sourceCurrency, totalPayerPays)}
            </Button>
          ))}
        </div>
      </div>
      {sentence ? <p className="type-body text-[var(--fg-2)]">{sentence}</p> : null}
    </div>
  )
}

function actionLabel(
  action: (typeof actionOrder)[number],
  includedCount: number,
  sourceCurrency: string,
  totalPayerPays: string | null,
): string {
  if (action === 'pay') {
    return `Pay ${includedCount} contractors · ${formatMoney(sourceCurrency, totalPayerPays)}`
  }
  if (action === 'requote') return 'Refresh quote'
  if (action === 'advance') return 'Advance statuses'
  return 'Discard draft'
}
