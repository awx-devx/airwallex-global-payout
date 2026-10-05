import type { ReactNode } from 'react'
import { Money } from './money'
import { Savings } from './savings'

export function CostSummary({
  payerPays,
  fee,
  savings,
  sourceCurrency,
}: {
  payerPays: string | null
  fee: string | null
  savings: string | null
  sourceCurrency: string
}) {
  return (
    <div>
      <Figure label="You pay">
        <Money currency={sourceCurrency} value={payerPays} size="bar" />
      </Figure>
      <Figure label="Fee">
        <Money currency={sourceCurrency} value={fee} />
      </Figure>
      <Figure label="Savings">
        <Savings savings={savings} currency={sourceCurrency} />
      </Figure>
    </div>
  )
}

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-[var(--line-1)] py-3">
      <span className="type-label">{label}</span>
      {children}
    </div>
  )
}
