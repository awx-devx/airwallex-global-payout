import { parseMoney, railLabel, sumMoney } from '@/contracts'
import type { FieldError, QuoteSummary, RailQuote } from '@/contracts'
import { AirwallexError } from '@/server/adapters/airwallex/errors'
import type {
  BatchItemDraft,
  MappedBatch,
  MappedItem,
  PaymentsGateway,
} from '@/server/adapters/payments/gateway'

const QUOTE_EXPIRES_AT = '2026-04-02T19:00:00.000Z'

type CorridorPrice = { pays: string; fee: string; system: string | null }

const LOCAL: Record<string, CorridorPrice> = {
  'USD:4200.00': { pays: '4200.00', fee: '0.00', system: 'ACH' },
  'GBP:3100.00': { pays: '3980.00', fee: '0.00', system: 'FASTER_PAYMENTS' },
  'EUR:2800.00': { pays: '3060.00', fee: '0.00', system: null },
  'AUD:3600.00': { pays: '2410.00', fee: '0.00', system: 'BANK_TRANSFER' },
  'SGD:4100.00': { pays: '3090.00', fee: '0.00', system: 'FAST' },
  'INR:185000.00': { pays: '2220.00', fee: '0.00', system: null },
}

const SWIFT: Record<string, CorridorPrice> = {
  'USD:4200.00': { pays: '4215.00', fee: '15.00', system: null },
  'GBP:3100.00': { pays: '4002.50', fee: '22.50', system: null },
  'EUR:2800.00': { pays: '3078.00', fee: '18.00', system: null },
  'AUD:3600.00': { pays: '2430.00', fee: '20.00', system: null },
  'SGD:4100.00': { pays: '3112.00', fee: '22.00', system: null },
}

type StoredBatch = {
  id: string
  requestId: string
  name: string
  runId: string
  airwallexStatus: string
  shortReference: string | null
  items: MappedItem[]
  nextItem: number
}

export function createMockGateway(options?: {
  available?: string
  pending?: string
  rejectItem?: (item: BatchItemDraft) => FieldError[] | null
}): PaymentsGateway {
  const available = options?.available ?? '50000.00'
  const pending = options?.pending ?? '0.00'
  const batches = new Map<string, StoredBatch>()
  const transfers = new Map<string, string>()

  function requireDraft(batch: StoredBatch) {
    if (batch.airwallexStatus !== 'DRAFTING') {
      throw new AirwallexError({
        status: 400,
        code: 'invalid_state',
        message: 'The batch is not a draft.',
        source: null,
        fieldErrors: [],
        traceId: null,
      })
    }
  }

  return {
    async currentBalance(currency) {
      return { currency, available, pending }
    },
    async createBatch(input) {
      const existing = [...batches.values()].find((batch) => batch.requestId === input.requestId)
      if (existing) {
        throw new AirwallexError({
          status: 400,
          code: 'batch_request_id_duplicate',
          message: 'The request ID has been used to a batch before which was created successfully.',
          source: null,
          fieldErrors: [],
          traceId: null,
        })
      }
      const batch: StoredBatch = {
        id: `bat_${input.requestId}`,
        requestId: input.requestId,
        name: input.name,
        runId: input.runId,
        airwallexStatus: 'DRAFTING',
        shortReference: null,
        items: [],
        nextItem: 1,
      }
      batches.set(batch.id, batch)
      return toBatch(batch)
    },
    async findBatchByRequestId(requestId) {
      const batch = [...batches.values()].find((entry) => entry.requestId === requestId)
      return batch ? toBatch(batch) : null
    },
    async addItems(batchId, items) {
      const batch = requireBatch(batches, batchId)
      requireDraft(batch)
      for (const item of items) {
        batch.items.push(priceItem(item, batch.nextItem, options?.rejectItem))
        batch.nextItem += 1
      }
    },
    async listItems(batchId) {
      return requireBatch(batches, batchId).items.map((item) => ({
        ...item,
        rail: item.rail ? { ...item.rail } : null,
      }))
    },
    async deleteItems(batchId, itemIds) {
      const batch = requireBatch(batches, batchId)
      requireDraft(batch)
      const drop = new Set(itemIds)
      batch.items = batch.items.filter((item) => !drop.has(item.airwallexItemId))
    },
    async quoteBatch(batchId, validity) {
      const batch = requireBatch(batches, batchId)
      requireDraft(batch)
      return quoteItems(batch.items, validity)
    },
    async submitBatch(batchId) {
      const batch = requireBatch(batches, batchId)
      requireDraft(batch)
      batch.airwallexStatus = 'BOOKING'
      batch.shortReference = `B-${batch.runId.slice(0, 8)}`
      for (const item of batch.items) {
        if (item.status === 'ready') {
          item.status = 'booking'
          item.airwallexItemStatus = 'BOOKING'
        }
      }
      return toBatch(batch)
    },
    async getBatch(batchId) {
      return toBatch(requireBatch(batches, batchId))
    },
    async deleteBatch(batchId) {
      const batch = requireBatch(batches, batchId)
      requireDraft(batch)
      batches.delete(batchId)
    },
    async getTransfer(transferId) {
      const status = transfers.get(transferId)
      if (!status) {
        throw new AirwallexError({
          status: 404,
          code: 'not_found',
          message: 'Transfer not found.',
          source: null,
          fieldErrors: [],
          traceId: null,
        })
      }
      return { id: transferId, status }
    },
    async transitionTransfer(transferId, nextStatus) {
      transfers.set(transferId, nextStatus)
    },
  }
}

function requireBatch(batches: Map<string, StoredBatch>, batchId: string): StoredBatch {
  const batch = batches.get(batchId)
  if (!batch) {
    throw new AirwallexError({
      status: 404,
      code: 'not_found',
      message: 'Batch not found.',
      source: null,
      fieldErrors: [],
      traceId: null,
    })
  }
  return batch
}

function toBatch(batch: StoredBatch): MappedBatch {
  return {
    id: batch.id,
    airwallexStatus: batch.airwallexStatus,
    shortReference: batch.shortReference,
  }
}

function priceItem(
  item: BatchItemDraft,
  sequence: number,
  rejectItem?: (item: BatchItemDraft) => FieldError[] | null,
): MappedItem {
  const rejected = rejectItem?.(item) ?? null
  if (rejected && rejected.length > 0) {
    return {
      airwallexItemId: `itm_${sequence}_${item.metadata.candidate}`,
      requestId: item.requestId,
      rowIndex: Number(item.metadata.row),
      candidate: item.metadata.candidate,
      airwallexItemStatus: 'VALIDATION_FAILED',
      status: 'needs_fix',
      fieldErrors: rejected,
      transferId: null,
      shortReference: null,
      rail: null,
    }
  }
  const key = `${item.transferCurrency}:${item.transferAmount}`
  const known = item.transferMethod === 'SWIFT' ? SWIFT[key] : LOCAL[key]
  const price = known ?? { pays: item.transferAmount, fee: '0.00', system: null }
  const rail: RailQuote = {
    transferMethod: item.transferMethod,
    localClearingSystem: price.system,
    railLabel: railLabel(item.transferMethod, price.system, item.transferCurrency),
    amountPayerPays: price.pays,
    feeAmount: price.fee,
    feeCurrency: item.sourceCurrency,
    amountBeneficiaryReceives: item.transferAmount,
    sourceCurrency: item.sourceCurrency,
    transferCurrency: item.transferCurrency,
  }
  return {
    airwallexItemId: `itm_${sequence}_${item.metadata.candidate}`,
    requestId: item.requestId,
    rowIndex: Number(item.metadata.row),
    candidate: item.metadata.candidate,
    airwallexItemStatus: 'VALIDATED',
    status: 'ready',
    fieldErrors: [],
    transferId: null,
    shortReference: null,
    rail,
  }
}

function quoteItems(items: readonly MappedItem[], validity: 'HR_1' | 'MIN_15'): QuoteSummary {
  const priced = items.flatMap((item) => (item.rail ? [item.rail] : []))
  if (priced.length === 0) throw new Error('Nothing to quote')
  const sourceCurrency = priced[0]?.sourceCurrency
  if (!sourceCurrency) throw new Error('Nothing to quote')
  const lines = priced.map((rail) => {
    const sameCurrency = rail.sourceCurrency === rail.transferCurrency
    return {
      sourceCurrency: rail.sourceCurrency,
      transferCurrency: rail.transferCurrency,
      amountPayerPays: rail.amountPayerPays,
      amountBeneficiaryReceives: rail.amountBeneficiaryReceives,
      feeAmount: rail.feeAmount,
      clientRate: sameCurrency
        ? null
        : parseMoney(rail.amountBeneficiaryReceives)
            .div(parseMoney(rail.amountPayerPays))
            .toFixed(6),
      currencyPair: sameCurrency ? null : `${rail.sourceCurrency}${rail.transferCurrency}`,
    }
  })
  return {
    expiresAt: QUOTE_EXPIRES_AT,
    validity,
    payerPays: sumMoney(
      lines.map((line) => line.amountPayerPays),
      sourceCurrency,
    ),
    feeAmount: sumMoney(
      lines.map((line) => line.feeAmount),
      sourceCurrency,
    ),
    sourceCurrency,
    lines,
  }
}
