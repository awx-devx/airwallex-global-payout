import { describe, expect, it } from 'vitest'
import { ContractError, SAMPLE_CONTRACTORS_CSV, parseMoney } from '@/contracts'
import { balanceOk, runReady } from '@/mocks'
import { AirwallexError } from '@/server/adapters/airwallex/errors'
import type { PaymentsGateway } from '@/server/adapters/payments/gateway'
import { createMockGateway } from '@/server/adapters/payments/mock-gateway'
import { findRunById, saveRun } from '@/server/db/runs'
import { createRunService, type RunService } from '@/server/services/runs'

const CLOCK = '2026-04-02T18:00:00.000Z'
const EXPIRED = '2026-04-02T19:00:00.000Z'

describe('run pricing and pay', () => {
  it('prices the sample like run_ready, aside from ids', async () => {
    const clock = { current: new Date(CLOCK) }
    const gateway = createMockGateway({ now: () => clock.current })
    const { service } = harness(gateway, clock)
    const detail = await service.createRun({
      fileName: 'contractors.csv',
      text: SAMPLE_CONTRACTORS_CSV,
    })

    expect(detail.status).toBe('READY')
    expect(detail.airwallexStatus).toBe('DRAFTING')
    expect(detail.rows).toEqual(runReady.rows)
    expect(detail.quote).toEqual(runReady.quote)
    expect(detail.totalPayerPays).toBe('18960.00')
    expect(detail.totalSavings).toBe('97.50')
    expect(detail.allowedActions).toEqual(['discard', 'exclude'])
    expect(detail.balance).toEqual(balanceOk)
    expect(detail.flags.needsAttention).toBe(true)
    expect(detail.poll).toBe(true)

    const batchId = detail.airwallexBatchId
    if (!batchId) throw new Error('expected a batch')
    const items = await gateway.listItems(batchId)
    expect(items.map((item) => `${item.rowIndex}:${item.candidate}`)).toEqual([
      '1:L',
      '2:L',
      '3:L',
      '4:L',
      '5:L',
      '6:L',
    ])
    for (const row of detail.rows) {
      const alternative = row.pricing.alternatives[0]
      if (!row.pricing.chosen || !alternative) continue
      expect(
        parseMoney(row.pricing.chosen.amountPayerPays).lte(parseMoney(alternative.amountPayerPays)),
      ).toBe(true)
    }
  })

  it('loads the existing batch when create reports a duplicate request id', async () => {
    const inner = createMockGateway()
    let creates = 0
    const gateway: PaymentsGateway = {
      ...inner,
      async createBatch(input, context) {
        creates += 1
        const created = await inner.createBatch(input, context)
        throw new AirwallexError({
          status: 400,
          code: 'batch_request_id_duplicate',
          message: 'The request ID has been used to a batch before which was created successfully.',
          source: null,
          fieldErrors: [],
          traceId: null,
        })
      },
    }
    const { service } = harness(gateway)
    const detail = await service.createRun({
      fileName: 'contractors.csv',
      text: SAMPLE_CONTRACTORS_CSV,
    })

    expect(creates).toBe(1)
    expect(detail.airwallexBatchId).toBe(`bat_b:${detail.id}`)
    expect(detail.rows.filter((row) => row.status === 'ready')).toHaveLength(6)
    const found = await inner.findBatchByRequestId(`b:${detail.id}`)
    expect(found?.id).toBe(detail.airwallexBatchId)
    expect(await inner.listItems(found?.id ?? '')).toHaveLength(6)
  })

  it('keeps a row that fails both probes out of the quote', async () => {
    const gateway = createMockGateway({
      rejectItem: (item) =>
        item.metadata.row === '1'
          ? [{ path: 'account_number', message: 'Account number is invalid.' }]
          : null,
    })
    const { service } = harness(gateway)
    const detail = await service.createRun({
      fileName: 'contractors.csv',
      text: SAMPLE_CONTRACTORS_CSV,
    })

    const maya = detail.rows.find((row) => row.contractorName === 'Maya Chen')
    expect(maya).toMatchObject({
      status: 'needs_fix',
      fieldErrors: [{ path: 'account_number', message: 'Account number is invalid.' }],
      pricing: { chosen: null, alternatives: [], savings: null },
    })
    expect(detail.quote?.lines.some((line) => line.amountBeneficiaryReceives === '4200.00')).toBe(
      false,
    )
    expect(detail.quote?.payerPays).toBe('14760.00')
    expect(detail.allowedActions).toEqual(['discard', 'exclude'])
  })

  it('excludes the invalid row, requotes the same batch, and discards a draft', async () => {
    const clock = { current: new Date(CLOCK) }
    const inner = createMockGateway({ now: () => clock.current })
    const quoted: string[] = []
    let deleted = 0
    const gateway: PaymentsGateway = {
      ...inner,
      async quoteBatch(batchId, validity, context) {
        quoted.push(batchId)
        return inner.quoteBatch(batchId, validity, context)
      },
      async deleteBatch(batchId, context) {
        deleted += 1
        await inner.deleteBatch(batchId, context)
      },
    }
    const { service } = harness(gateway, clock)
    const created = await service.createRun({
      fileName: 'contractors.csv',
      text: SAMPLE_CONTRACTORS_CSV,
    })
    const batchId = created.airwallexBatchId
    if (!batchId) throw new Error('expected a batch')

    const excluded = await service.excludeRow(created.id, 'row_7')
    expect(excluded.rows.find((row) => row.id === 'row_7')?.status).toBe('excluded')
    expect(excluded.allowedActions).toContain('pay')
    await expect(service.excludeRow(created.id, 'row_1')).rejects.toMatchObject({
      status: 409,
      code: 'INVALID_STATE',
    })

    clock.current = new Date(EXPIRED)
    const refreshed = await service.requote(created.id)
    expect(quoted.every((id) => id === batchId)).toBe(true)
    expect(quoted).toHaveLength(3)
    expect(refreshed.airwallexBatchId).toBe(batchId)
    expect(refreshed.quote?.validity).toBe('HR_1')

    const discarded = await service.discard(created.id)
    expect(discarded.status).toBe('DISCARDED')
    expect(deleted).toBe(1)
    await expect(inner.getBatch(batchId)).rejects.toBeInstanceOf(AirwallexError)
  })

  it('does not delete a batch that is no longer drafting', async () => {
    const gateway = createMockGateway()
    let deleted = 0
    gateway.deleteBatch = async () => {
      deleted += 1
    }
    const { service } = harness(gateway)
    const created = await service.createRun({
      fileName: 'contractors.csv',
      text: SAMPLE_CONTRACTORS_CSV,
    })
    const stored = await findRunById(created.id)
    if (!stored) throw new Error('expected the run')
    stored.airwallexStatus = 'BOOKED'
    await saveRun(stored)

    const discarded = await service.discard(created.id)
    expect(discarded.status).toBe('DISCARDED')
    expect(deleted).toBe(0)
  })

  it('pays once, then rejects a second pay, an expired quote, and a short wallet', async () => {
    const clock = { current: new Date(CLOCK) }
    const gateway = createMockGateway({ now: () => clock.current })
    const { service } = harness(gateway, clock)
    const created = await service.createRun({
      fileName: 'contractors.csv',
      text: SAMPLE_CONTRACTORS_CSV,
    })
    await service.excludeRow(created.id, 'row_7')

    const paid = await service.pay(created.id)
    expect(paid.status).toBe('SUBMITTED')
    expect(paid.airwallexStatus).toBe('BOOKING')
    expect(
      paid.rows.filter((row) => row.status !== 'excluded').every((row) => row.status === 'booking'),
    ).toBe(true)
    await expect(service.pay(created.id)).rejects.toMatchObject({
      status: 409,
      code: 'INVALID_STATE',
    })

    const expired = await service.createRun({
      fileName: 'contractors.csv',
      text: SAMPLE_CONTRACTORS_CSV,
    })
    await service.excludeRow(expired.id, 'row_7')
    clock.current = new Date(EXPIRED)
    await expect(service.pay(expired.id)).rejects.toBeInstanceOf(ContractError)
    await expect(service.pay(expired.id)).rejects.toMatchObject({ code: 'QUOTE_EXPIRED' })
    expect((await service.getRun(expired.id)).airwallexStatus).toBe('DRAFTING')

    clock.current = new Date(CLOCK)
    const shortGateway = createMockGateway({ available: '1.00' })
    const short = harness(shortGateway).service
    const priced = await short.createRun({
      fileName: 'contractors.csv',
      text: SAMPLE_CONTRACTORS_CSV,
    })
    const cleared = await short.excludeRow(priced.id, 'row_7')
    expect(cleared.flags.insufficientBalance).toBe(true)
    expect(cleared.allowedActions).toEqual(['discard'])
  })

  it('returns insufficient balance when the wallet drops after the quote', async () => {
    const inner = createMockGateway()
    let available = '50000.00'
    const gateway: PaymentsGateway = {
      ...inner,
      async currentBalance(currency) {
        return { currency, available, pending: '0.00' }
      },
    }
    const { service } = harness(gateway)
    const created = await service.createRun({
      fileName: 'contractors.csv',
      text: SAMPLE_CONTRACTORS_CSV,
    })
    await service.excludeRow(created.id, 'row_7')
    available = '1.00'

    await expect(service.pay(created.id)).rejects.toMatchObject({
      status: 409,
      code: 'INSUFFICIENT_BALANCE',
    })
    const after = await service.getRun(created.id)
    expect(after.status).toBe('READY')
    expect(after.flags.insufficientBalance).toBe(true)
    expect(after.allowedActions).toEqual(['discard'])
  })

  it('lists runs newest first and reads the wallet', async () => {
    const { service, clock } = harness()
    clock.current = new Date('2026-04-02T18:00:00.000Z')
    const older = await service.createRun({
      fileName: 'older.csv',
      text: SAMPLE_CONTRACTORS_CSV,
    })
    clock.current = new Date('2026-04-02T18:05:00.000Z')
    const newer = await service.createRun({
      fileName: 'newer.csv',
      text: SAMPLE_CONTRACTORS_CSV,
    })

    const listed = await service.listRuns()
    const ids = listed.map((run) => run.id)
    expect(ids.indexOf(newer.id)).toBeLessThan(ids.indexOf(older.id))
    expect(await service.getBalance()).toEqual(balanceOk)
    await expect(service.getRun('missing-run')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    })
  })
})

function harness(
  gateway: PaymentsGateway = createMockGateway(),
  clock: { current: Date } = { current: new Date(CLOCK) },
): {
  service: RunService
  clock: { current: Date }
} {
  let sequence = 0
  const service = createRunService({
    gateway,
    sourceCurrency: 'USD',
    demo: false,
    now: () => clock.current,
    createId: () => {
      sequence += 1
      return `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`
    },
  })
  return { service, clock }
}
