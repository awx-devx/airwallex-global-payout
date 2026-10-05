import type { Balance } from '@/contracts'
import { formatMoney } from '@/ui/format/money'

export function BalancePill({ balance }: { balance: Balance }) {
  return (
    <span className="nums inline-flex border border-[var(--line-2)] bg-[var(--bg-2)] px-3 py-2 text-[14px] leading-5 text-[var(--fg-1)]">
      {balance.currency} available {amountOnly(balance.currency, balance.available)}
    </span>
  )
}

function amountOnly(currency: string, value: string): string {
  const formatted = formatMoney(currency, value)
  const prefix = `${currency} `
  return formatted.startsWith(prefix) ? formatted.slice(prefix.length) : formatted
}
