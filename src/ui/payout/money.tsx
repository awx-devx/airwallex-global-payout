import { formatMoney } from '@/ui/format/money'

export function Money({
  currency,
  value,
  signed = false,
  size = 'body',
}: {
  currency: string
  value: string | null
  signed?: boolean
  size?: 'body' | 'bar'
}) {
  return (
    <span className={size === 'bar' ? 'type-money' : 'nums type-body'}>
      {formatMoney(currency, value, { signed })}
    </span>
  )
}
