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
  return (
    <div className="flex items-center justify-between gap-6 border-b border-[var(--line-1)] py-3">
      <span className="type-body text-[var(--fg-3)]">
        {warn
          ? 'This price has expired. Refresh the quote to pay.'
          : 'Time left before this price expires.'}
      </span>
      <span className={`inline-flex items-center gap-2 ${warn ? 'text-[var(--warn)]' : ''}`}>
        <ClockIcon />
        <span className="nums type-body">{text}</span>
      </span>
    </div>
  )
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 5.25 V8 L10 9.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
