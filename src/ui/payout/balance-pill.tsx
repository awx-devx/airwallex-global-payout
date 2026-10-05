import type { Balance } from '@/contracts'
import { formatMoney } from '@/ui/format/money'

export function BalancePill({ balance, className = '' }: { balance: Balance; className?: string }) {
  return (
    <span
      className={`radius-pill nums inline-flex border border-[var(--line-2)] bg-[var(--bg-1)] px-3 py-2 text-[14px] leading-5 whitespace-nowrap text-[var(--fg-1)] ${className}`}
    >
      {balance.currency} available {amountOnly(balance.currency, balance.available)}
    </span>
  )
}

function amountOnly(currency: string, value: string): string {
  const formatted = formatMoney(currency, value)
  const prefix = `${currency} `
  return formatted.startsWith(prefix) ? formatted.slice(prefix.length) : formatted
}
