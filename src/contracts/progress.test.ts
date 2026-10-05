import { describe, expect, it } from 'vitest'
import { runProgress, type ProgressRun } from './progress'
import type { RowStatus } from './schemas'

function run(overrides: Partial<ProgressRun> & Pick<ProgressRun, 'status'>): ProgressRun {
  const { flags, ...rest } = overrides
  return {
    airwallexStatus: null,
    quoteExpired: false,
    rows: [{ status: 'ready' }],
    error: null,
    ...rest,
    flags: { needsAttention: false, approvalHold: false, ...flags },
  }
}

function detail(progress: ReturnType<typeof runProgress>): string | null {
  const current = progress.steps.find((step) => step.id === progress.currentId)
  return current?.detail ?? null
}

describe('runProgress branches', () => {
  it('fails pricing when the batch never reached Airwallex', () => {
    const progress = runProgress(run({ status: 'FAILED', error: null }))
    expect(progress.currentId).toBe('price')
    expect(progress.steps[1]?.state).toBe('failed')
    expect(detail(progress)).toBe('Pricing failed.')
  })

  it('uses the error message when Airwallex reports FAILED', () => {
    const progress = runProgress(
      run({ status: 'FAILED', airwallexStatus: 'FAILED', error: { message: 'Wallet lookup failed.' } }),
    )
    expect(progress.currentId).toBe('pay')
    expect(detail(progress)).toBe('Wallet lookup failed.')
  })

  it('follows the first matching submitted sentence', () => {
    const rows = (statuses: RowStatus[]) => statuses.map((status) => ({ status }))
    expect(
      detail(runProgress(run({ status: 'SUBMITTED', airwallexStatus: 'OVERDUE', rows: rows(['processing']) }))),
    ).toBe('The wallet did not cover the batch. Airwallex will retry funding.')
    expect(
      detail(
        runProgress(
          run({
            status: 'SUBMITTED',
            airwallexStatus: 'BOOKED',
            rows: rows(['paid', 'processing']),
          }),
        ),
      ),
    ).toBe('1 of 2 paid.')
    expect(
      detail(runProgress(run({ status: 'SUBMITTED', airwallexStatus: 'BOOKED', rows: rows(['sent', 'sent']) }))),
    ).toBe('2 of 2 sent.')
    expect(
      detail(
        runProgress(run({ status: 'SUBMITTED', airwallexStatus: 'PARTIALLY_BOOKED', rows: rows(['booking']) })),
      ),
    ).toBe('Booking each payout.')
    expect(
      detail(runProgress(run({ status: 'SUBMITTED', airwallexStatus: 'SCHEDULED', rows: rows(['ready']) }))),
    ).toBe('Submitted. Waiting for the wallet to fund the batch.')
    expect(
      detail(runProgress(run({ status: 'SUBMITTED', airwallexStatus: 'BOOKED', rows: rows(['processing']) }))),
    ).toBe('Payouts are booked and processing.')
  })

  it('lands on Done once every included row is terminal', () => {
    const paid = runProgress(run({ status: 'SUBMITTED', rows: [{ status: 'paid' }, { status: 'excluded' }] }))
    expect(paid.currentId).toBe('done')
    expect(paid.steps[4]?.state).toBe('complete')
    expect(detail(paid)).toBe('All contractors are paid.')

    const mixed = runProgress(
      run({ status: 'SUBMITTED', rows: [{ status: 'paid' }, { status: 'booking_failed' }] }),
    )
    expect(mixed.steps[4]?.state).toBe('failed')
    expect(detail(mixed)).toBe('1 of 2 paid.')
  })

  it('prefers the needs-attention sentence over an expired quote', () => {
    const progress = runProgress(
      run({ status: 'READY', quoteExpired: true, flags: { needsAttention: true, approvalHold: false } }),
    )
    expect(detail(progress)).toBe('Exclude the rows with errors before paying.')
  })

  it('describes a discarded draft on Review', () => {
    const progress = runProgress(run({ status: 'DISCARDED' }))
    expect(progress.currentId).toBe('review')
    expect(detail(progress)).toBe('Draft discarded. Nothing was paid.')
    expect(progress.steps[0]?.state).toBe('complete')
    expect(progress.steps[3]?.state).toBe('upcoming')
  })
})
