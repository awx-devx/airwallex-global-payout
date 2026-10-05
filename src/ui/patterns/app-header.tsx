import type { Balance } from '@/contracts'
import { BalancePill } from '@/ui/payout/balance-pill'
import { Badge } from '@/ui/primitives/badge'
import { focusRing } from '@/ui/primitives/button'

export function AppHeader({
  balance,
  balanceState = 'ready',
  sandbox = true,
  backHref,
}: {
  balance: Balance | null
  balanceState?: 'ready' | 'loading' | 'error'
  sandbox?: boolean
  backHref?: string
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line-1)] py-4">
      <div className="flex flex-wrap items-center gap-4">
        {backHref ? (
          <a href={backHref} className={`${focusRing} type-body text-[var(--fg-2)]`}>
            Payouts
          </a>
        ) : null}
        <p className="type-title">Contractor payouts</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {sandbox ? <Badge tone="muted">Sandbox</Badge> : null}
        <BalanceSlot balance={balance} balanceState={balanceState} />
      </div>
    </header>
  )
}

function BalanceSlot({
  balance,
  balanceState,
}: {
  balance: Balance | null
  balanceState: 'ready' | 'loading' | 'error'
}) {
  if (balanceState === 'loading') return <span className="shimmer inline-block h-9 w-52" />
  if (balanceState === 'error' || !balance) {
    return (
      <span className="radius-pill inline-flex items-center border border-[var(--line-2)] bg-[var(--bg-1)] px-3 py-2 text-[14px] leading-5 text-[var(--fg-2)]">
        Balance unavailable
      </span>
    )
  }
  return <BalancePill balance={balance} />
}
