import { describe, expect, it } from 'vitest'
import { parseMoney } from './currencies'
import { RunDetailSchema, RunProgressSchema } from './schemas'
import { allowedActions, poll, settled } from './permissions'
import { runProgress } from './progress'
import {
  balanceOk,
  balanceShort,
  fixtureBalances,
  fixtureRuns,
  runApproval,
  runDone,
  runExpired,
  runFailed,
  runInflight,
  runPricing,
  runReady,
  runReadyClean,
  runShort,
} from '../mocks/fixtures'

const EXPECTED_ACTIONS = {
  run_pricing: ['discard'],
  run_ready: ['discard', 'exclude'],
  run_ready_clean: ['pay', 'discard'],
  run_expired: ['requote', 'discard'],
  run_short: ['discard'],
  run_inflight: ['advance'],
  run_approval: ['advance'],
  run_done: [],
  run_failed: [],
} as const

describe('fixtures', () => {
  it('parses every kit run and both balances', () => {
    for (const run of Object.values(fixtureRuns)) {
      expect(RunDetailSchema.parse(run)).toEqual(run)
      expect(RunProgressSchema.parse(runProgress(run))).toEqual(runProgress(run))
      expect(allowedActions(run)).toEqual(run.allowedActions)
      expect(poll(run)).toBe(run.poll)
      expect(settled(run)).toBe(run.settled)
    }
    expect(fixtureBalances.balance_ok).toBe(balanceOk)
    expect(fixtureBalances.balance_short).toBe(balanceShort)
    const cleanTotal = runReadyClean.totalPayerPays
    expect(cleanTotal).toBe('189.60')
    if (cleanTotal == null) throw new Error('expected a payer total')
    expect(parseMoney(balanceOk.available).gt(parseMoney(cleanTotal))).toBe(true)
    expect(parseMoney(balanceShort.available).lt(parseMoney(cleanTotal))).toBe(true)
  })

  it('checks allowedActions and runProgress for each kit run', () => {
    for (const [id, actions] of Object.entries(EXPECTED_ACTIONS)) {
      const run = fixtureRuns[id as keyof typeof fixtureRuns]
      expect(run.allowedActions).toEqual(actions)
    }

    expect(runPricing.poll).toBe(true)
    expect(runPricing.totalPayerPays).toBeNull()
    expect(runPricing.totalSavings).toBeNull()
    expect(runPricing.rows).toHaveLength(6)
    expect(runProgress(runPricing).currentId).toBe('price')
    expect(runProgress(runPricing).steps[1]?.detail).toBe('Comparing local and SWIFT for each contractor.')

    expect(runReady.quoteExpired).toBe(false)
    expect(runReady.flags.needsAttention).toBe(true)
    expect(runReady.includedCount).toBe(6)
    expect(runReady.needsAttentionCount).toBe(1)
    expect(runReady.allowedActions).not.toContain('pay')
    expect(runProgress(runReady).steps.find((step) => step.id === 'review')?.detail).toBe(
      'Exclude the rows with errors before paying.',
    )

    const sam = runReady.rows.find((row) => row.contractorName === 'Sam Rivera')
    expect(sam).toMatchObject({
      status: 'invalid',
      fieldErrors: [{ path: 'postcode', message: 'postcode is required.' }],
    })
    expect(runReady.rows.find((row) => row.contractorName === 'Priya Nair')?.pricing.savings).toBeNull()
    expect(runReady.rows.find((row) => row.contractorName === 'Maya Chen')).toMatchObject({
      pricing: {
        chosen: { railLabel: 'ACH', amountPayerPays: '42.00', feeAmount: '0.00' },
        savings: '0.15',
      },
    })
    expect(runReady.rows.map((row) => row.pricing.chosen?.railLabel)).toEqual([
      'ACH',
      'Faster Payments',
      'SEPA',
      'Bank transfer',
      'FAST',
      'Local',
      undefined,
    ])

    expect(runReadyClean.totalPayerPays).toBe('189.60')
    expect(runReadyClean.totalSavings).toBe('0.98')
    expect(runReadyClean.quote?.payerPays).toBe('189.60')
    expect(runReadyClean.quote?.feeAmount).toBe('0.00')
    expect(runReadyClean.flags.needsAttention).toBe(false)
    expect(runProgress(runReadyClean).steps.find((step) => step.id === 'review')?.detail).toBe(
      'Cheapest rail is selected. Nothing has been paid.',
    )

    expect(runExpired.quoteExpired).toBe(true)
    expect(runExpired.flags.quoteExpired).toBe(true)
    expect(runProgress(runExpired).steps.find((step) => step.id === 'review')?.detail).toBe(
      'Quote expired. Refresh it to pay.',
    )

    expect(runShort.flags.insufficientBalance).toBe(true)
    expect(runShort.allowedActions).not.toContain('pay')

    expect(runInflight.status).toBe('SUBMITTED')
    expect(runInflight.airwallexStatus).toBe('BOOKING')
    expect(runInflight.poll).toBe(true)
    expect(runInflight.settled).toBe(false)
    expect(runInflight.rows.some((row) => row.status === 'sent' || row.status === 'paid')).toBe(false)
    expect(runInflight.rows.some((row) => row.status === 'booking')).toBe(true)
    expect(runInflight.rows.some((row) => row.status === 'processing')).toBe(true)
    expect(runProgress(runInflight).currentId).toBe('pay')
    expect(runProgress(runInflight).steps.find((step) => step.id === 'pay')?.detail).toBe('Booking each payout.')

    expect(runApproval.flags.approvalHold).toBe(true)
    expect(runProgress(runApproval).steps.find((step) => step.id === 'pay')?.detail).toBe(
      'Waiting for approval in Airwallex.',
    )

    expect(runDone.settled).toBe(true)
    expect(runDone.poll).toBe(false)
    expect(runDone.rows.filter((row) => row.status === 'paid')).toHaveLength(5)
    expect(runDone.rows.find((row) => row.contractorName === 'Priya Nair')).toMatchObject({
      status: 'failed',
      fieldErrors: [{ path: 'row', message: 'The beneficiary bank rejected the payout.' }],
    })
    const done = runProgress(runDone)
    expect(done.currentId).toBe('done')
    expect(done.steps[4]).toMatchObject({ state: 'failed', detail: '5 of 6 paid.' })

    const failed = runProgress(runFailed)
    expect(failed.currentId).toBe('pay')
    expect(failed.steps.find((step) => step.id === 'pay')).toMatchObject({
      state: 'failed',
      detail: 'The batch could not be booked.',
    })
  })
})
