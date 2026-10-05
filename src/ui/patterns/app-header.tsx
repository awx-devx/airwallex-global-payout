import Image from 'next/image'
import Link from 'next/link'
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
    <header className="flex min-w-0 items-center justify-between gap-2 border-b border-[var(--line-1)] py-2.5 min-[800px]:gap-4 min-[800px]:py-4">
      <div className="flex min-w-0 items-center gap-2 min-[800px]:gap-3">
        <Link
          href="/"
          className={`${focusRing} inline-flex h-10 shrink-0 items-center gap-2 min-[800px]:gap-3`}
        >
          <Image
            src="/assets/logomark.png"
            alt=""
            width={68}
            height={40}
            sizes="68px"
            priority
            className="brand-mark shrink-0"
          />
          <span className="type-title sr-only truncate min-[800px]:not-sr-only">
            Global Payouts
          </span>
        </Link>
        {backHref ? (
          <Link
            href={backHref}
            className={`${focusRing} inline-flex h-10 shrink-0 items-center type-body whitespace-nowrap text-[var(--fg-2)] max-[479px]:hidden`}
          >
            Payouts
          </Link>
        ) : null}
      </div>
      <div className="flex min-w-0 items-center justify-end gap-2 min-[800px]:gap-3">
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
  return <BalancePill balance={balance} className="max-[479px]:px-2 max-[479px]:py-1" />
}
