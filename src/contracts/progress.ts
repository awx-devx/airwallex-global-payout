import type { ProgressStepId, RowStatus, RunProgress, RunStatus, StepState } from './schemas'
import { settled } from './permissions'

const STEP_ORDER = ['upload', 'price', 'review', 'pay', 'done'] as const

const STEP_LABEL = {
  upload: 'Upload',
  price: 'Price',
  review: 'Review',
  pay: 'Pay',
  done: 'Done',
} as const

export type ProgressRun = {
  status: RunStatus
  airwallexStatus: string | null
  quoteExpired: boolean
  rows: ReadonlyArray<{ status: RowStatus }>
  flags: {
    needsAttention: boolean
    approvalHold: boolean
  }
  error: { message: string } | null
}

export function runProgress(run: ProgressRun): RunProgress {
  switch (run.status) {
    case 'PRICING':
      return place('price', 'current', 'Comparing local and SWIFT for each contractor.')
    case 'READY':
      if (run.flags.needsAttention) {
        return place('review', 'current', 'Exclude the rows with errors before paying.')
      }
      if (run.quoteExpired) {
        return place('review', 'current', 'Quote expired. Refresh it to pay.')
      }
      return place('review', 'current', 'Cheapest rail is selected. Nothing has been paid.')
    case 'SUBMITTED':
      return submittedProgress(run)
    case 'FAILED':
      if (run.airwallexStatus === 'FAILED') {
        return place('pay', 'failed', run.error?.message ?? 'Pricing failed.')
      }
      return place('price', 'failed', run.error?.message ?? 'Pricing failed.')
    case 'DISCARDED':
      return place('review', 'current', 'Draft discarded. Nothing was paid.')
    default:
      return assertNever(run.status)
  }
}

function submittedProgress(run: ProgressRun): RunProgress {
  const active = run.rows.filter((row) => row.status !== 'excluded')
  const paid = active.filter((row) => row.status === 'paid').length
  const sent = active.filter((row) => row.status === 'sent').length
  const included = active.length

  if (settled(run)) {
    const hasFailure = active.some(
      (row) => row.status === 'failed' || row.status === 'booking_failed',
    )
    const everyPaid = included > 0 && active.every((row) => row.status === 'paid')
    if (hasFailure || !everyPaid) return place('done', 'failed', `${paid} of ${included} paid.`)
    return place('done', 'complete', 'All contractors are paid.')
  }

  if (run.flags.approvalHold || run.airwallexStatus === 'IN_APPROVAL') {
    return place('pay', 'current', 'Waiting for approval in Airwallex.')
  }
  if (run.airwallexStatus === 'OVERDUE') {
    return place('pay', 'current', 'The wallet did not cover the batch. Airwallex will retry funding.')
  }
  if (paid > 0) return place('pay', 'current', `${paid} of ${included} paid.`)
  if (sent > 0) return place('pay', 'current', `${sent} of ${included} sent.`)
  if (
    run.airwallexStatus === 'BOOKING' ||
    run.airwallexStatus === 'PARTIALLY_BOOKED' ||
    active.some((row) => row.status === 'booking')
  ) {
    return place('pay', 'current', 'Booking each payout.')
  }
  if (run.airwallexStatus === 'SCHEDULED') {
    return place('pay', 'current', 'Submitted. Waiting for the wallet to fund the batch.')
  }
  return place('pay', 'current', 'Payouts are booked and processing.')
}

function place(currentId: ProgressStepId, state: StepState, detail: string): RunProgress {
  const currentIndex = STEP_ORDER.indexOf(currentId)
  const steps = STEP_ORDER.map((id, index) => ({
    id,
    label: STEP_LABEL[id],
    state: stepState(index, currentIndex, state),
    detail: index === currentIndex ? detail : null,
  })) as RunProgress['steps']

  return { steps, currentId }
}

function stepState(index: number, currentIndex: number, currentState: StepState): StepState {
  if (index < currentIndex) return 'complete'
  if (index > currentIndex) return 'upcoming'
  return currentState
}

function assertNever(value: never): never {
  throw new Error(`Unexpected run status: ${String(value)}`)
}
