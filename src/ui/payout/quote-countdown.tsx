import { formatCountdown } from '@/ui/format/countdown'

export function QuoteCountdown({
  expiresAt,
  expired,
  now,
}: {
  expiresAt: string
  expired: boolean
  now: Date
}) {
  const text = expired ? 'Expired' : formatCountdown(expiresAt, now)
  const warn = text === 'Expired'
  return <span className={warn ? 'nums text-[var(--warn)]' : 'nums type-body'}>{text}</span>
}
