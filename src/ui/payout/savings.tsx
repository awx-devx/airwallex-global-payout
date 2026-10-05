import { savingsTone } from '@/ui/format/money'

const toneClass = {
  up: 'text-[var(--up)]',
  muted: 'text-[var(--muted)]',
  only: 'text-[var(--fg-3)]',
} as const

export function Savings({ savings, currency }: { savings: string | null; currency: string }) {
  const tone = savingsTone(savings, currency)
  return <span className={`nums type-body ${toneClass[tone.tone]}`}>{tone.text}</span>
}
