import type { RowStatus, RunSummary } from '@/contracts'
import { formatRunDate } from '@/ui/format/date'
import { Money } from '@/ui/payout/money'
import { StatusBadge } from '@/ui/payout/status-badge'
import { focusRing } from '@/ui/primitives/button'
import { EmptyState } from '@/ui/primitives/empty-state'

export type RunListRun = RunSummary & {
  rows: readonly { status: RowStatus }[]
}

const columns = ['File', 'Created', 'Status', 'Contractors', 'You pay'] as const

export function RunList({
  runs,
  state = 'ready',
}: {
  runs: readonly RunListRun[]
  state?: 'ready' | 'loading' | 'empty'
}) {
  if (state === 'loading') return <LoadingRows />
  if (state === 'empty' || runs.length === 0) {
    return <EmptyState title="No payouts yet" action={null} />
  }

  return (
    <table className="w-full table-fixed border-collapse text-left">
      <caption className="sr-only">Payouts</caption>
      <thead>
        <tr className="bg-[var(--bg-2)]">
          {columns.map((column) => (
            <th key={column} scope="col" className="type-label h-10 px-3 text-left font-[500]">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {runs.map((run) => (
          <tr key={run.id} className="h-[52px] border-b border-[var(--line-1)]">
            <td className="px-3">
              <a href={`/runs/${run.id}`} className={`${focusRing} type-body text-[var(--fg-1)]`}>
                {run.fileName}
              </a>
            </td>
            <td className="type-body px-3">{formatRunDate(run.createdAt)}</td>
            <td className="px-3">
              <StatusBadge
                kind="run"
                status={run.status}
                airwallexStatus={run.airwallexStatus}
                quoteExpired={run.quoteExpired}
                rows={run.rows}
              />
            </td>
            <td className="nums type-body px-3">{run.includedCount}</td>
            <td className="px-3">
              <Money currency={run.sourceCurrency} value={run.totalPayerPays} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function LoadingRows() {
  return (
    <div aria-busy="true">
      {Array.from({ length: 2 }, (_, index) => (
        <div
          key={index}
          className="flex h-[52px] items-center border-b border-[var(--line-1)] px-3"
        >
          <div className="shimmer h-4 w-40" />
          <div className="shimmer ml-auto h-4 w-24" />
        </div>
      ))}
    </div>
  )
}
