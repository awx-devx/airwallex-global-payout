import { Badge } from '@/ui/primitives/badge'

export function RailChip({ railLabel, chosen }: { railLabel: string; chosen: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="type-body whitespace-nowrap">{railLabel}</span>
      {chosen ? <Badge tone="info">Cheapest</Badge> : null}
    </span>
  )
}
