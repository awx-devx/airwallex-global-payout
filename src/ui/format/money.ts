import { parseMoney, toMoneyString } from '@/contracts'

export function formatMoney(
  currency: string,
  value: string | null,
  options?: { signed?: boolean },
): string {
  if (value == null) return '—'
  const amount = parseMoney(value)
  const body = groupThousands(toMoneyString(amount, currency))
  const sign = options?.signed && amount.gt(0) ? '+' : ''
  return `${sign}${currency} ${body}`
}

export function savingsTone(
  savings: string | null,
  currency: string,
): { tone: 'up' | 'muted' | 'only'; text: string } {
  if (savings == null) return { tone: 'only', text: 'Only rail' }
  const amount = parseMoney(savings)
  if (amount.gt(0)) return { tone: 'up', text: formatMoney(currency, savings, { signed: true }) }
  return { tone: 'muted', text: 'Same price' }
}

function groupThousands(amount: string): string {
  const [whole, fraction] = amount.split('.')
  if (!whole) return amount
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return fraction == null ? grouped : `${grouped}.${fraction}`
}
