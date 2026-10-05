import { Badge } from '@/ui/primitives/badge'
import { rowBadges, runBadge, type RunBadgeInput } from './status-map'
import type { RowStatus } from '@/contracts'

export type StatusBadgeProps =
  { kind: 'row'; status: RowStatus } | ({ kind: 'run' } & RunBadgeInput)

export function StatusBadge(props: StatusBadgeProps) {
  const badge = props.kind === 'row' ? rowBadges[props.status] : runBadge(props)
  return <Badge tone={badge.tone}>{badge.label}</Badge>
}
