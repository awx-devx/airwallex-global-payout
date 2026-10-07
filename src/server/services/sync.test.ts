import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { SAMPLE_CONTRACTORS_CSV } from '@/contracts'
import type { MappedItem, PaymentsGateway } from '@/server/adapters/payments/gateway'
import { createMockGateway } from '@/server/adapters/payments/mock-gateway'
import { createRunService, type RunService } from '@/server/services/runs'
import { receiveAirwallexWebhook } from '@/server/services/webhooks'

const CLOCK = '2026-04-02T18:00:00.000Z'
const SECRET = 'whsec_test'

describe('status sync', () => {
  it('maps a booked transfer that is paid and stops polling once every row is settled', async () => {
    const inner = createMockGateway()
    const live = { current: false }
    let reads = 0
    const gateway = wrap(inner, {
      live: () => live.current,
      onList: () => {
        reads += 1
      },
      transferStatus: () => 'PAID',
    })
    const service = harness(gateway)
    const created = await service.createRun({
      fileName: 'contractors.csv',
      text: SAMPLE_CONTRACTORS_CSV,
    })
    await service.excludeRow(created.id, 'row_7')
    const paid = await service.pay(created.id)
    live.current = true

    const refreshed = await service.getRun(paid.id)
    expect(refreshed.rows.find((row) => row.index === 1)?.status).toBe('paid')
    expect(refreshed.rows.find((row) => row.index === 1)?.transferId).toBe('tr_1')
    expect(refreshed.settled).toBe(true)
    expect(refreshed.poll).toBe(false)

    await service.getRun(paid.id)
    expect(reads).toBe(1)
  })

  it('keeps a failed transfer failed when a later read says cancelled', async () => {
    const inner = createMockGateway()
    const live = { current: false }
    let transferStatus = 'FAILED'
    const gateway = wrap(inner, {
      live: () => live.current,
      include: (item) => item.rowIndex === 1,
      transferStatus: () => transferStatus,
    })
    const service = harness(gateway)
    const created = await service.createRun({
      fileName: 'contractors.csv',
      text: SAMPLE_CONTRACTORS_CSV,
    })
    await service.excludeRow(created.id, 'row_7')
    await service.pay(created.id)
    live.current = true

    const failed = await service.getRun(created.id)
    expect(failed.rows.find((row) => row.index === 1)?.status).toBe('failed')

    transferStatus = 'CANCELLED'
    const later = await service.getRun(created.id)
    expect(later.rows.find((row) => row.index === 1)?.status).toBe('failed')
    expect(later.rows.find((row) => row.index === 7)?.status).toBe('excluded')
  })

  it('applies a signed batch webhook once and ignores a duplicate and an unknown id', async () => {
    const inner = createMockGateway()
    const live = { current: false }
    let reads = 0
    const gateway = wrap(inner, {
      live: () => live.current,
      onList: () => {
        reads += 1
      },
      transferStatus: () => 'PAID',
    })
    const service = harness(gateway)
    const created = await service.createRun({
      fileName: 'contractors.csv',
      text: SAMPLE_CONTRACTORS_CSV,
    })
    await service.excludeRow(created.id, 'row_7')
    const paid = await service.pay(created.id)
    const batchId = paid.airwallexBatchId
    if (!batchId) throw new Error('expected a batch')
    live.current = true

    const body = JSON.stringify({
      id: `evt_${paid.id}`,
      name: 'payout.batch_transfers.booked',
      data: { id: batchId, status: 'BOOKED' },
    })
    const timestamp = String(Date.parse(CLOCK))
    const signature = createHmac('sha256', SECRET).update(`${timestamp}${body}`).digest('hex')
    const deliver = () =>
      receiveAirwallexWebhook(
        { rawBody: body, timestamp, signature, secret: SECRET, now: Date.parse(CLOCK) },
        (event) => service.applyWebhook(event),
      )

    expect(await deliver()).toBe(200)
    const synced = await service.getRun(paid.id)
    expect(synced.rows.every((row) => row.status === 'paid' || row.status === 'excluded')).toBe(
      true,
    )
    expect(synced.poll).toBe(false)
    expect(reads).toBe(1)

    expect(await deliver()).toBe(200)
    expect(reads).toBe(1)

    const unknown = JSON.stringify({
      id: `evt_unknown_${paid.id}`,
      name: 'payout.transfer.paid',
      data: { object: { id: 'tr_missing' } },
    })
    expect(
      await receiveAirwallexWebhook(
        {
          rawBody: unknown,
          timestamp,
          signature: createHmac('sha256', SECRET).update(`${timestamp}${unknown}`).digest('hex'),
          secret: SECRET,
          now: Date.parse(CLOCK),
        },
        (event) => service.applyWebhook(event),
      ),
    ).toBe(200)
    expect(reads).toBe(1)
  })

  it('rejects a webhook with a bad signature', async () => {
    const body = '{"id":"evt_bad","name":"payout.transfer.paid","data":{"id":"tr_1"}}'
    const timestamp = String(Date.parse(CLOCK))
    expect(
      await receiveAirwallexWebhook(
        {
          rawBody: body,
          timestamp,
          signature: 'aa',
          secret: SECRET,
          now: Date.parse(CLOCK),
        },
        async () => {
          throw new Error('should not apply')
        },
      ),
    ).toBe(400)
  })
})

function wrap(
  inner: PaymentsGateway,
  options: {
    live: () => boolean
    transferStatus: () => string
    onList?: () => void
    include?: (item: MappedItem) => boolean
  },
): PaymentsGateway {
  const include = options.include ?? (() => true)
  return {
    ...inner,
    async listItems(batchId, context) {
      const items = await inner.listItems(batchId, context)
      if (!options.live()) return items
      options.onList?.()
      return items.map((item) => {
        if (!include(item)) return item
        return {
          ...item,
          airwallexItemStatus: 'BOOKED',
          transferId: `tr_${item.rowIndex ?? 0}`,
        }
      })
    },
    async getTransfer(transferId) {
      return { id: transferId, status: options.transferStatus() }
    },
  }
}

function harness(gateway: PaymentsGateway): RunService {
  let sequence = 0
  return createRunService({
    gateway,
    sourceCurrency: 'USD',
    demo: false,
    now: () => new Date(CLOCK),
    createId: () => {
      sequence += 1
      return `20000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`
    },
  })
}
