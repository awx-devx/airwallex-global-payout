import type { RowStatus, RunRow } from '@/contracts'
import { ContractorRows } from '@/ui/payout/contractor-row'

export function orderReviewRows<T extends { status: RowStatus; index: number }>(
  rows: readonly T[],
): T[] {
  return [...rows].sort((left, right) => {
    const rank = (status: RowStatus) => (status === 'excluded' ? 1 : 0)
    return rank(left.status) - rank(right.status) || left.index - right.index
  })
}

export function ReviewTable({
  rows,
  layout,
  onExclude,
}: {
  rows: readonly RunRow[]
  layout: 'row' | 'card'
  onExclude?: (rowId: string) => void
}) {
  return <ContractorRows rows={orderReviewRows(rows)} layout={layout} onExclude={onExclude} />
}
