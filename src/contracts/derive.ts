import { sumMoney } from './currencies'
import { allowedActions, includedRows, needsAttention, poll, settled } from './permissions'
import type { RunDetail, RunDraftFlags, RunRow, RunSummary } from './schemas'

export type RunDraft = Omit<
  RunDetail,
  | 'rowCount'
  | 'includedCount'
  | 'needsAttentionCount'
  | 'totalPayerPays'
  | 'totalSavings'
  | 'settled'
  | 'quoteExpired'
  | 'poll'
  | 'allowedActions'
  | 'flags'
> & {
  flags: RunDraftFlags
}

export function deriveRun(draft: RunDraft, nowIso: string): RunDetail {
  const rows = structuredClone(draft.rows) as RunRow[]
  const attention = needsAttention(rows)
  const quoteExpired =
    draft.status === 'READY' &&
    draft.quote !== null &&
    Date.parse(draft.quote.expiresAt) <= Date.parse(nowIso)

  const run: RunDetail = {
    ...draft,
    rows,
    quote: structuredClone(draft.quote),
    balance: structuredClone(draft.balance),
    error: draft.error ? { ...draft.error } : null,
    rowCount: rows.length,
    includedCount: includedRows(rows).length,
    needsAttentionCount: rows.filter((row) => row.status === 'invalid' || row.status === 'needs_fix')
      .length,
    totalPayerPays: null,
    totalSavings: null,
    settled: false,
    quoteExpired,
    poll: false,
    flags: {
      insufficientBalance: draft.flags.insufficientBalance,
      quoteExpired,
      needsAttention: attention,
      approvalHold: draft.airwallexStatus === 'IN_APPROVAL',
      demo: draft.flags.demo,
    },
    allowedActions: [],
  }

  run.settled = settled(run)
  run.poll = poll(run)
  run.totalPayerPays = payerTotal(run)
  run.totalSavings = savingsTotal(run)
  run.allowedActions = allowedActions(run)
  return run
}

export function toRunSummary(run: RunDetail): RunSummary {
  return {
    id: run.id,
    fileName: run.fileName,
    createdAt: run.createdAt,
    status: run.status,
    airwallexStatus: run.airwallexStatus,
    sourceCurrency: run.sourceCurrency,
    rowCount: run.rowCount,
    includedCount: run.includedCount,
    needsAttentionCount: run.needsAttentionCount,
    totalPayerPays: run.totalPayerPays,
    totalSavings: run.totalSavings,
    settled: run.settled,
    quoteExpired: run.quoteExpired,
  }
}

export function toRunDraft(run: RunDetail): RunDraft {
  return {
    id: run.id,
    fileName: run.fileName,
    createdAt: run.createdAt,
    status: run.status,
    airwallexStatus: run.airwallexStatus,
    sourceCurrency: run.sourceCurrency,
    rows: run.rows,
    quote: run.quote,
    balance: run.balance,
    error: run.error,
    shortReference: run.shortReference,
    airwallexBatchId: run.airwallexBatchId,
    flags: {
      insufficientBalance: run.flags.insufficientBalance,
      demo: run.flags.demo,
    },
  }
}

function payerTotal(run: RunDetail): string | null {
  if (run.status === 'PRICING') return null
  if (run.quote) return run.quote.payerPays
  const amounts = includedRows(run.rows).flatMap((row) =>
    row.pricing.chosen ? [row.pricing.chosen.amountPayerPays] : [],
  )
  if (amounts.length === 0) return null
  return sumMoney(amounts, run.sourceCurrency)
}

function savingsTotal(run: RunDetail): string | null {
  if (run.status === 'PRICING') return null
  const amounts = includedRows(run.rows).flatMap((row) =>
    row.pricing.savings != null ? [row.pricing.savings] : [],
  )
  if (amounts.length === 0) return null
  return sumMoney(amounts, run.sourceCurrency)
}
