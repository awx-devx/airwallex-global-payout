export function KeyValue({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-[var(--line-1)] py-3">
      <span className="type-label">{label}</span>
      <span className={mono ? 'type-id text-[var(--fg-1)]' : 'nums type-body'}>{value}</span>
    </div>
  )
}
