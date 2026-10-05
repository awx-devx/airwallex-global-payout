import type { RowStatus, RunAction, RunStatus } from './schemas'

const SETTLED_ROW_STATUSES = new Set<RowStatus>(['paid', 'failed', 'cancelled', 'booking_failed'])

export type PermissionRun = {
  status: RunStatus
  quoteExpired: boolean
  rows: ReadonlyArray<{ status: RowStatus }>
  flags: {
    insufficientBalance: boolean
    demo: boolean
  }
}

export function includedRows<T extends { status: RowStatus }>(rows: readonly T[]): T[] {
  return rows.filter((row) => row.status !== 'excluded' && row.status !== 'invalid')
}

export function needsAttention(rows: ReadonlyArray<{ status: RowStatus }>): boolean {
  return rows.some((row) => row.status === 'invalid' || row.status === 'needs_fix')
}

/** True when the run is SUBMITTED and every non-excluded row is in a terminal status. */
export function settled(run: Pick<PermissionRun, 'status' | 'rows'>): boolean {
  if (run.status !== 'SUBMITTED') return false
  const active = run.rows.filter((row) => row.status !== 'excluded')
  return active.every((row) => SETTLED_ROW_STATUSES.has(row.status))
}

export function poll(run: Pick<PermissionRun, 'status' | 'rows'>): boolean {
  if (run.status === 'PRICING' || run.status === 'READY') return true
  return run.status === 'SUBMITTED' && !settled(run)
}

export function allowedActions(run: PermissionRun): RunAction[] {
  const actions: RunAction[] = []
  const attention = needsAttention(run.rows)
  const includedCount = includedRows(run.rows).length

  if (
    run.status === 'READY' &&
    !run.quoteExpired &&
    !attention &&
    includedCount > 0 &&
    !run.flags.insufficientBalance
  ) {
    actions.push('pay')
  }
  if (run.status === 'READY' && run.quoteExpired) actions.push('requote')
  if (run.status === 'PRICING' || run.status === 'READY') actions.push('discard')
  if ((run.status === 'READY' || run.status === 'PRICING') && attention) actions.push('exclude')
  if (run.flags.demo && run.status === 'SUBMITTED' && !settled(run)) actions.push('advance')
  return actions
}
