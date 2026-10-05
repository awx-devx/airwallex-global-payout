'use client'

import type { ReactNode } from 'react'
import type { RunRow } from '@/contracts'
import { Button } from '@/ui/primitives/button'
import { Tooltip } from '@/ui/primitives/tooltip'
import { FieldErrors } from './field-errors'
import { Money } from './money'
import { RailChip } from './rail-chip'
import { Savings } from './savings'
import { StatusBadge } from './status-badge'

const columns = ['Contractor', 'Receives', 'Rail', 'Fee', 'You pay', 'Savings', 'Status'] as const

export function ContractorRows({
  rows,
  layout,
  onExclude,
}: {
  rows: readonly RunRow[]
  layout: 'row' | 'card'
  onExclude?: (rowId: string) => void
}) {
  if (layout === 'card') {
    return (
      <div>
        {rows.map((row) => (
          <ContractorRow key={row.id} row={row} layout="card" onExclude={onExclude} />
        ))}
      </div>
    )
  }

  return (
    <table className="w-full table-fixed border-collapse text-left">
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
        {rows.map((row) => (
          <ContractorRow key={row.id} row={row} layout="row" onExclude={onExclude} />
        ))}
      </tbody>
    </table>
  )
}

export function ContractorRow({
  row,
  layout,
  onExclude,
}: {
  row: RunRow
  layout: 'row' | 'card'
  onExclude?: (rowId: string) => void
}) {
  const dimmed = row.status === 'excluded'
  if (layout === 'card') {
    return (
      <article
        className={`grid gap-3 border-b border-[var(--line-1)] py-4 ${dimmed ? 'text-[var(--fg-3)]' : ''}`}
      >
        <Identity row={row} />
        <CardLine label="Receives">
          <Receives row={row} />
        </CardLine>
        <CardLine label="Rail">
          <Rail row={row} />
        </CardLine>
        <CardLine label="Fee">
          <Fee row={row} />
        </CardLine>
        <CardLine label="You pay">
          <YouPay row={row} />
        </CardLine>
        <CardLine label="Savings">
          <Saving row={row} />
        </CardLine>
        <CardLine label="Status">
          <Status row={row} onExclude={onExclude} />
        </CardLine>
        <FieldErrors errors={row.fieldErrors} />
      </article>
    )
  }

  return (
    <>
      <tr
        className={`border-b border-[var(--line-1)] hover:bg-[var(--bg-3)] ${dimmed ? 'text-[var(--fg-3)]' : ''}`}
      >
        <td className="px-3 py-3">
          <Identity row={row} />
        </td>
        <td className="px-3 py-3">
          <Receives row={row} />
        </td>
        <td className="px-3 py-3">
          <Rail row={row} />
        </td>
        <td className="px-3 py-3">
          <Fee row={row} />
        </td>
        <td className="px-3 py-3">
          <YouPay row={row} />
        </td>
        <td className="px-3 py-3">
          <Saving row={row} />
        </td>
        <td className="px-3 py-3">
          <Status row={row} onExclude={onExclude} />
        </td>
      </tr>
      {row.fieldErrors.length > 0 ? (
        <tr className="border-b border-[var(--line-1)]">
          <td colSpan={columns.length} className="px-3 py-2">
            <FieldErrors errors={row.fieldErrors} />
          </td>
        </tr>
      ) : null}
    </>
  )
}

function Identity({ row }: { row: RunRow }) {
  return (
    <div className="grid min-w-0">
      <Tooltip label={row.contractorName}>
        <span className="type-body">{row.contractorName}</span>
      </Tooltip>
      <span className="truncate text-[12px] leading-4 text-[var(--fg-3)]" title={row.email}>
        {row.email}
      </span>
    </div>
  )
}

function Receives({ row }: { row: RunRow }) {
  if (row.status === 'pricing') return <FigureSkeleton />
  return <Money currency={row.currency} value={row.amount} />
}

function Rail({ row }: { row: RunRow }) {
  if (row.status === 'pricing') return <FigureSkeleton />
  const chosen = row.pricing.chosen
  const alternative = row.pricing.alternatives[0]
  if (!chosen) return <span className="type-body text-[var(--fg-3)]">—</span>
  return (
    <div className="grid gap-1">
      <RailChip railLabel={chosen.railLabel} chosen={row.pricing.alternatives.length > 0} />
      {alternative ? (
        <span className="text-[12px] leading-4 text-[var(--fg-3)]">
          instead of {alternative.railLabel}
        </span>
      ) : null}
    </div>
  )
}

function Fee({ row }: { row: RunRow }) {
  if (row.status === 'pricing') return <FigureSkeleton />
  const chosen = row.pricing.chosen
  if (!chosen) return <Money currency={row.currency} value={null} />
  return <Money currency={chosen.feeCurrency} value={chosen.feeAmount} />
}

function YouPay({ row }: { row: RunRow }) {
  if (row.status === 'pricing') return <FigureSkeleton />
  const chosen = row.pricing.chosen
  if (!chosen) return <Money currency="USD" value={null} />
  return <Money currency={chosen.sourceCurrency} value={chosen.amountPayerPays} />
}

function Saving({ row }: { row: RunRow }) {
  if (row.status === 'pricing') return <FigureSkeleton />
  if (!row.pricing.chosen) return <span className="type-body text-[var(--fg-3)]">—</span>
  return <Savings savings={row.pricing.savings} currency={row.pricing.chosen.sourceCurrency} />
}

function Status({ row, onExclude }: { row: RunRow; onExclude?: (rowId: string) => void }) {
  const canExclude = row.status === 'invalid' || row.status === 'needs_fix'
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge kind="row" status={row.status} />
      {canExclude ? (
        <Button variant="ghost" className="px-3 py-1" onClick={() => onExclude?.(row.id)}>
          Exclude
        </Button>
      ) : null}
    </div>
  )
}

function CardLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="type-label">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  )
}

function FigureSkeleton() {
  return <div className="shimmer h-4 w-16" />
}
