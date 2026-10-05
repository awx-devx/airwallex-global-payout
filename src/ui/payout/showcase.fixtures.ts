import { rowErrorMessage, runProgress } from '@/contracts'
import type { ProgressRun, RowStatus, RunProgress, RunRow } from '@/contracts'
import {
  balanceOk,
  runApproval,
  runDone,
  runExpired,
  runFailed,
  runInflight,
  runPricing,
  runReady,
  runReadyClean,
  runShort,
} from '@/mocks/fixtures'

function findRow(rows: readonly RunRow[], name: string): RunRow {
  const row = rows.find((item) => item.contractorName === name)
  if (!row) throw new Error(`${name} is missing from the payout showcase`)
  return row
}

const maya = findRow(runReady.rows, 'Maya Chen')

export const needsFixRow: RunRow = {
  ...structuredClone(maya),
  id: 'row_needs_fix',
  status: 'needs_fix',
  pricing: { chosen: null, alternatives: [], savings: null },
  fieldErrors: [
    {
      path: 'account_number',
      message: rowErrorMessage('MISSING_BANK_FIELD', 'account_number', 'US'),
    },
  ],
}

export const readyRows = runReady.rows

function tagged(row: RunRow, id: string): RunRow {
  return { ...structuredClone(row), id }
}

export const stateRows: readonly RunRow[] = [
  tagged(findRow(runPricing.rows, 'Maya Chen'), 'state_pricing'),
  needsFixRow,
  tagged(findRow(runReadyClean.rows, 'Sam Rivera'), 'state_excluded'),
  tagged(findRow(runInflight.rows, 'Maya Chen'), 'state_processing'),
  tagged(findRow(runDone.rows, 'Maya Chen'), 'state_paid'),
  tagged(findRow(runDone.rows, 'Priya Nair'), 'state_failed'),
]

export const samErrors = findRow(runReady.rows, 'Sam Rivera').fieldErrors
export const priyaErrors = findRow(runDone.rows, 'Priya Nair').fieldErrors

if (!runReady.quote || !runExpired.quote || !runReadyClean.quote) {
  throw new Error('payout showcase quotes are missing')
}

export const readyQuote = runReady.quote
export const expiredQuote = runExpired.quote
export const readyExpired = runReady.quoteExpired
export const expiredFlag = runExpired.quoteExpired

export const cleanCost = {
  payerPays: runReadyClean.totalPayerPays,
  fee: runReadyClean.quote.feeAmount,
  savings: runReadyClean.totalSavings,
  sourceCurrency: runReadyClean.sourceCurrency,
}

export const balance = balanceOk

export const payBars = [
  runPricing,
  runReady,
  runReadyClean,
  runExpired,
  runShort,
  runApproval,
  runInflight,
] as const

function six(status: RowStatus): { status: RowStatus }[] {
  return Array.from({ length: 6 }, () => ({ status }))
}

function submitted(airwallexStatus: string, rows: readonly { status: RowStatus }[]): ProgressRun {
  return {
    status: 'SUBMITTED',
    airwallexStatus,
    quoteExpired: false,
    rows,
    flags: { needsAttention: false, approvalHold: false },
    error: null,
  }
}

export const stepperSamples: readonly { id: string; label: string; progress: RunProgress }[] = [
  { id: 'pricing', label: 'Pricing', progress: runProgress(runPricing) },
  { id: 'review-attention', label: 'Review, needs attention', progress: runProgress(runReady) },
  { id: 'review-expired', label: 'Review, quote expired', progress: runProgress(runExpired) },
  { id: 'review', label: 'Review', progress: runProgress(runReadyClean) },
  { id: 'pay-approval', label: 'Pay, approval', progress: runProgress(runApproval) },
  {
    id: 'pay-overdue',
    label: 'Pay, overdue',
    progress: runProgress(submitted('OVERDUE', six('processing'))),
  },
  {
    id: 'pay-paid',
    label: 'Pay, some paid',
    progress: runProgress(
      submitted('BOOKED', [
        { status: 'paid' },
        { status: 'processing' },
        { status: 'processing' },
        { status: 'processing' },
        { status: 'processing' },
        { status: 'processing' },
      ]),
    ),
  },
  {
    id: 'pay-sent',
    label: 'Pay, some sent',
    progress: runProgress(
      submitted('BOOKED', [
        { status: 'sent' },
        { status: 'processing' },
        { status: 'processing' },
        { status: 'processing' },
        { status: 'processing' },
        { status: 'processing' },
      ]),
    ),
  },
  { id: 'pay-booking', label: 'Pay, booking', progress: runProgress(runInflight) },
  {
    id: 'pay-scheduled',
    label: 'Pay, scheduled',
    progress: runProgress(submitted('SCHEDULED', six('processing'))),
  },
  {
    id: 'pay-processing',
    label: 'Pay, processing',
    progress: runProgress(submitted('BOOKED', six('processing'))),
  },
  { id: 'done-paid', label: 'Done, paid', progress: runProgress(submitted('BOOKED', six('paid'))) },
  { id: 'done-failures', label: 'Done, failures', progress: runProgress(runDone) },
  { id: 'pay-failed', label: 'Pay, failed', progress: runProgress(runFailed) },
  {
    id: 'price-failed',
    label: 'Price, failed',
    progress: runProgress({
      status: 'FAILED',
      airwallexStatus: null,
      quoteExpired: false,
      rows: six('pricing'),
      flags: { needsAttention: false, approvalHold: false },
      error: null,
    }),
  },
  {
    id: 'discarded',
    label: 'Discarded',
    progress: runProgress({
      status: 'DISCARDED',
      airwallexStatus: null,
      quoteExpired: false,
      rows: runReady.rows,
      flags: { needsAttention: false, approvalHold: false },
      error: null,
    }),
  },
]

export const pricingProgress = runProgress(runPricing)
export const reviewProgress = runProgress(runReadyClean)

export const paidRun = {
  status: 'SUBMITTED' as const,
  airwallexStatus: 'BOOKED',
  quoteExpired: false,
  rows: six('paid'),
}

export const discardedRun = {
  status: 'DISCARDED' as const,
  airwallexStatus: null,
  quoteExpired: false,
  rows: [] as { status: RowStatus }[],
}

export const runBadgeRuns = [
  runPricing,
  runExpired,
  runReadyClean,
  runApproval,
  runInflight,
  runDone,
  runFailed,
] as const
