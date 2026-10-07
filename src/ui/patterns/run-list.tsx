'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'motion/react'
import type { RowStatus, RunSummary } from '@/contracts'
import { formatRunDate } from '@/ui/format/date'
import { Money } from '@/ui/payout/money'
import { StatusBadge } from '@/ui/payout/status-badge'
import { focusRing } from '@/ui/primitives/button'
import { EmptyState } from '@/ui/primitives/empty-state'
import { useMounted } from '@/ui/use-mounted'

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
    <div className="overflow-x-auto">
      <table className="w-max min-w-full border-collapse text-left">
        <caption className="sr-only">Payouts</caption>
        <thead>
          <tr className="bg-[var(--bg-2)]">
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className={`type-label h-10 px-3 text-left font-[500] whitespace-nowrap ${column === 'File' ? 'sticky left-0 z-10 bg-[var(--bg-2)]' : ''}`}
              >
                {column}
              </th>
            ))}
            <th scope="col" className="sticky right-0 z-10 w-10 bg-[var(--bg-2)] px-2">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <RunRow key={run.id} run={run} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function useCanHover() {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia('(hover: hover) and (pointer: fine)')
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => window.matchMedia('(hover: hover) and (pointer: fine)').matches,
    () => true,
  )
}

function RunRow({ run }: { run: RunListRun }) {
  const router = useRouter()
  const reduced = useReducedMotion() === true
  const canHover = useCanHover()
  const [hot, setHot] = useState(false)
  const href = `/runs/${run.id}`

  return (
    <tr
      className="group relative h-[52px] cursor-pointer border-b border-[var(--line-1)] transition-colors duration-150 hover:bg-[var(--bg-3)] focus-within:bg-[var(--bg-3)]"
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      onFocusCapture={() => setHot(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHot(false)
      }}
      onClick={() => router.push(href)}
    >
      <td className="sticky left-0 z-10 bg-[var(--bg-0)] px-3 whitespace-nowrap group-hover:bg-[var(--bg-3)] group-focus-within:bg-[var(--bg-3)]">
        <span className="type-body block max-w-40 truncate text-[var(--fg-1)]" title={run.fileName}>
          {run.fileName}
        </span>
      </td>
      <td className="type-body px-3 whitespace-nowrap">
        <Link
          href={href}
          aria-label={run.fileName}
          className={`${focusRing} absolute inset-0 z-20`}
          onClick={(event) => event.stopPropagation()}
        />
        {formatRunDate(run.createdAt)}
      </td>
      <td className="px-3 whitespace-nowrap">
        <StatusBadge
          kind="run"
          status={run.status}
          airwallexStatus={run.airwallexStatus}
          quoteExpired={run.quoteExpired}
          rows={run.rows}
        />
      </td>
      <td className="nums type-body px-3 whitespace-nowrap">{run.includedCount}</td>
      <td className="px-3 whitespace-nowrap">
        <Money currency={run.sourceCurrency} value={run.totalPayerPays} />
      </td>
      <td className="sticky right-0 z-10 w-10 bg-[var(--bg-0)] px-2 group-hover:bg-[var(--bg-3)] group-focus-within:bg-[var(--bg-3)]">
        <OpenArrow shown={hot || !canHover} reduced={reduced || !canHover} />
      </td>
    </tr>
  )
}

function OpenArrow({ shown, reduced }: { shown: boolean; reduced: boolean }) {
  const mounted = useMounted()
  const icon = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )

  if (!mounted) {
    return (
      <span aria-hidden className="relative z-30 inline-flex text-[var(--fg-2)] opacity-0">
        {icon}
      </span>
    )
  }

  return (
    <motion.span
      aria-hidden
      className="relative z-30 inline-flex text-[var(--fg-2)]"
      initial={false}
      animate={{ opacity: shown ? 1 : 0, x: shown || reduced ? 0 : -8 }}
      transition={{ duration: reduced ? 0 : 0.16, ease: 'easeOut' }}
    >
      {icon}
    </motion.span>
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
