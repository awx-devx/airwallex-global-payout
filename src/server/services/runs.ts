import { randomUUID } from 'node:crypto'
import {
  ContractError,
  deriveRun,
  parseMoney,
  toRunSummary,
  type FieldError,
  type RunDetail,
  type RunRow,
  type RunSummary,
} from '@/contracts'
import { AirwallexError } from '@/server/adapters/airwallex/errors'
import type {
  BatchItemDraft,
  MappedItem,
  PaymentsGateway,
} from '@/server/adapters/payments/gateway'
import { getPaymentsGateway } from '@/server/adapters/payments'
import { batchRequestId, itemRequestId } from '@/server/airwallex/ids'
import { pickCheapestRail, probeMethods } from '@/server/domain/rails'
import { parseUpload } from '@/server/domain/upload'
import {
  findRunById,
  listRuns as loadRuns,
  saveRun,
  type StoredRow,
  type StoredRun,
} from '@/server/db/runs'
import { getServerEnv } from '@/server/env'

const EMPTY_PRICING = { chosen: null, alternatives: [], savings: null }

export type CreateRunInput = {
  fileName: string
  text: string
  byteLength?: number
}

export type RunService = {
  createRun(input: CreateRunInput): Promise<RunDetail>
  getRun(id: string): Promise<RunDetail>
  listRuns(): Promise<RunSummary[]>
  pay(id: string): Promise<RunDetail>
  requote(id: string): Promise<RunDetail>
  discard(id: string): Promise<RunDetail>
  excludeRow(id: string, rowId: string): Promise<RunDetail>
  getBalance(): Promise<RunDetail['balance']>
}

export type RunServiceDeps = {
  gateway: PaymentsGateway
  sourceCurrency: string
  demo: boolean
  now?: () => Date
  createId?: () => string
}

export function createRunService(deps: RunServiceDeps): RunService {
  const now = deps.now ?? (() => new Date())
  const createId = deps.createId ?? randomUUID
  const gateway = deps.gateway

  return {
    async createRun(input) {
      const parsed = parseUpload(input)
      if (!parsed.ok) {
        const { code, message } = parsed.envelope.error
        throw new ContractError(400, code, message)
      }

      const id = createId()
      const run: StoredRun = {
        id,
        fileName: input.fileName,
        createdAt: now().toISOString(),
        status: 'PRICING',
        airwallexStatus: null,
        sourceCurrency: deps.sourceCurrency,
        rows: parsed.rows.map(storedRow),
        quote: null,
        balance: null,
        error: null,
        shortReference: null,
        airwallexBatchId: null,
        flags: { insufficientBalance: false, demo: deps.demo },
      }
      await saveRun(run)

      try {
        // DEMO-ONLY: pricing and submit run inline in the request.
        // PROD: put add, delete, quote, and submit on a queue with the same request_id builders.
        await priceRun(gateway, run)
      } catch (error) {
        if (error instanceof AirwallexError) {
          run.status = 'FAILED'
          run.error = { code: 'AIRWALLEX_ERROR', message: error.message }
          await saveRun(run)
        }
        throw error
      }
      return present(run, now())
    },

    async getRun(id) {
      return present(await requireRun(id), now())
    },

    async listRuns() {
      const runs = await loadRuns()
      return runs.map((run) => toRunSummary(present(run, now())))
    },

    async pay(id) {
      const run = await requireRun(id)
      if (quoteIsExpired(run, now())) {
        throw new ContractError(
          409,
          'QUOTE_EXPIRED',
          'The quote expired. Refresh it before paying.',
        )
      }
      assertAction(present(run, now()), 'pay', 'Pay is not available on this run.')
      if (!run.quote || !run.airwallexBatchId) {
        throw new ContractError(409, 'INVALID_STATE', 'Pay is not available on this run.')
      }

      const balance = await gateway.currentBalance(run.sourceCurrency, { runId: run.id })
      run.balance = balance
      if (parseMoney(balance.available).lt(parseMoney(run.quote.payerPays))) {
        run.flags.insufficientBalance = true
        await saveRun(run)
        throw new ContractError(
          409,
          'INSUFFICIENT_BALANCE',
          'The wallet does not cover this quote.',
        )
      }

      // DEMO-ONLY: pricing and submit run inline in the request.
      // PROD: put add, delete, quote, and submit on a queue with the same request_id builders.
      const submitted = await gateway.submitBatch(run.airwallexBatchId, { runId: run.id })
      const items = await gateway.listItems(run.airwallexBatchId, { runId: run.id })
      applyItemStatuses(run, items)
      run.status = 'SUBMITTED'
      run.airwallexStatus = submitted.airwallexStatus
      run.shortReference = submitted.shortReference
      run.flags.insufficientBalance = false
      await saveRun(run)
      return present(run, now())
    },

    async requote(id) {
      const run = await requireRun(id)
      assertAction(present(run, now()), 'requote', 'Requote is not available on this run.')
      if (!run.airwallexBatchId) {
        throw new ContractError(409, 'INVALID_STATE', 'Requote is not available on this run.')
      }
      run.quote = await gateway.quoteBatch(run.airwallexBatchId, 'HR_1', { runId: run.id })
      await readBalance(gateway, run)
      await saveRun(run)
      return present(run, now())
    },

    async discard(id) {
      const run = await requireRun(id)
      assertAction(present(run, now()), 'discard', 'Discard is not available on this run.')
      if (run.airwallexStatus === 'DRAFTING' && run.airwallexBatchId) {
        await gateway.deleteBatch(run.airwallexBatchId, { runId: run.id })
      }
      run.status = 'DISCARDED'
      await saveRun(run)
      return present(run, now())
    },

    async excludeRow(id, rowId) {
      const run = await requireRun(id)
      assertAction(present(run, now()), 'exclude', 'Exclude is not available on this run.')
      const row = run.rows.find((item) => item.id === rowId)
      if (!row) throw new ContractError(404, 'NOT_FOUND', 'Row not found.')
      if (row.status !== 'invalid' && row.status !== 'needs_fix') {
        throw new ContractError(
          409,
          'INVALID_STATE',
          'Only a row that needs attention can be excluded.',
        )
      }
      row.status = 'excluded'
      await saveRun(run)
      return present(run, now())
    },

    async getBalance() {
      return gateway.currentBalance(deps.sourceCurrency)
    },
  }
}

let singleton: RunService | undefined

export function getRunService(): RunService {
  singleton ??= createRunService({
    gateway: getPaymentsGateway(),
    sourceCurrency: getServerEnv().SOURCE_CURRENCY,
    demo: getServerEnv().DEMO_MODE === 'true',
  })
  return singleton
}

async function priceRun(gateway: PaymentsGateway, run: StoredRun): Promise<void> {
  const batch = await openBatch(gateway, {
    requestId: batchRequestId(run.id),
    name: run.fileName,
    runId: run.id,
  })
  run.airwallexBatchId = batch.id
  run.airwallexStatus = batch.airwallexStatus
  run.shortReference = batch.shortReference
  await saveRun(run)

  const probes = probesFor(run)
  if (probes.length > 0) {
    const context = { runId: run.id }
    const existing = await gateway.listItems(batch.id, context)
    const seen = new Set(existing.map((item) => item.requestId))
    const missing = probes.filter((probe) => !seen.has(probe.requestId))
    if (missing.length > 0) await gateway.addItems(batch.id, missing, context)

    const listed = await gateway.listItems(batch.id, context)
    if (listed.some((item) => item.rail)) {
      await gateway.quoteBatch(batch.id, 'HR_1', context)
    }
    const priced = await gateway.listItems(batch.id, context)
    const drop = chooseRails(run, priced)
    if (drop.length > 0) await gateway.deleteItems(batch.id, drop, context)

    const remaining = await gateway.listItems(batch.id, context)
    run.quote = remaining.some((item) => item.rail)
      ? await gateway.quoteBatch(batch.id, 'HR_1', context)
      : null
  }

  const current = await gateway.getBatch(batch.id, { runId: run.id })
  run.airwallexStatus = current.airwallexStatus
  run.shortReference = current.shortReference
  await readBalance(gateway, run)
  run.status = 'READY'
  await saveRun(run)
}

async function openBatch(
  gateway: PaymentsGateway,
  input: { requestId: string; name: string; runId: string },
): Promise<{ id: string; airwallexStatus: string; shortReference: string | null }> {
  try {
    return await gateway.createBatch(input, { runId: input.runId })
  } catch (error) {
    if (!(error instanceof AirwallexError) || error.code !== 'batch_request_id_duplicate')
      throw error
    const existing = await gateway.findBatchByRequestId(input.requestId, { runId: input.runId })
    if (!existing) throw error
    return existing
  }
}

function probesFor(run: StoredRun): BatchItemDraft[] {
  const probes: BatchItemDraft[] = []
  for (const row of run.rows) {
    if (row.status !== 'pricing') continue
    for (const method of probeMethods(row.currency)) {
      const candidate = method === 'LOCAL' ? 'L' : 'S'
      probes.push({
        requestId: itemRequestId(run.id, row.index, candidate),
        transferMethod: method,
        sourceCurrency: run.sourceCurrency,
        transferCurrency: row.currency,
        transferAmount: row.amount,
        reference: `PAY-${row.index}`,
        metadata: { row: String(row.index), candidate },
        beneficiary: {
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          dateOfBirth: row.dateOfBirth,
          address: {
            street: row.street,
            city: row.city,
            state: row.state,
            postcode: row.postcode,
            countryCode: row.country,
          },
          accountName: row.contractorName,
          accountCurrency: row.currency,
          bankCountryCode: row.country,
          accountNumber: row.accountNumber,
          iban: row.iban,
          routingType: row.routingType,
          routingValue: row.routingValue,
          swiftBic: row.swiftBic,
        },
      })
    }
  }
  return probes
}

function chooseRails(run: StoredRun, items: readonly MappedItem[]): string[] {
  const drop: string[] = []
  for (const row of run.rows) {
    if (row.status !== 'pricing') continue
    const probes = items.filter((item) => item.rowIndex === row.index)
    const quotes = probes.flatMap((item) => (item.rail ? [item.rail] : []))
    const decision = pickCheapestRail(quotes)
    if (!decision.chosen) {
      row.status = 'needs_fix'
      row.pricing = EMPTY_PRICING
      row.fieldErrors = dedupe(probes.flatMap((item) => item.fieldErrors))
      drop.push(...probes.map((item) => item.airwallexItemId))
      continue
    }
    const winner = probes.find(
      (item) => item.rail?.transferMethod === decision.chosen?.transferMethod,
    )
    if (!winner) throw new Error('Priced rail has no probe')
    row.status = 'ready'
    row.pricing = decision
    row.fieldErrors = []
    row.transferId = winner?.transferId ?? null
    row.shortReference = winner?.shortReference ?? null
    for (const item of probes) {
      if (item.airwallexItemId !== winner?.airwallexItemId) drop.push(item.airwallexItemId)
    }
  }
  return drop
}

function applyItemStatuses(run: StoredRun, items: readonly MappedItem[]): void {
  for (const row of run.rows) {
    if (row.status === 'invalid' || row.status === 'excluded') continue
    const item = items.find((candidate) => candidate.rowIndex === row.index)
    if (!item) continue
    row.status = item.status
    row.transferId = item.transferId
    row.shortReference = item.shortReference
    if (item.fieldErrors.length > 0) row.fieldErrors = item.fieldErrors
  }
}

async function readBalance(gateway: PaymentsGateway, run: StoredRun): Promise<void> {
  run.balance = await gateway.currentBalance(run.sourceCurrency, { runId: run.id })
  run.flags.insufficientBalance = run.quote
    ? parseMoney(run.balance.available).lt(parseMoney(run.quote.payerPays))
    : false
}

function storedRow(row: {
  id: string
  index: number
  contractorName: string
  firstName: string
  lastName: string
  email: string
  dateOfBirth: string
  country: string
  currency: string
  amount: string
  street: string
  city: string
  state: string
  postcode: string
  accountNumber: string
  iban: string
  routingType: string
  routingValue: string
  swiftBic: string
  status: 'valid' | 'invalid'
  fieldErrors: FieldError[]
}): StoredRow {
  return {
    ...row,
    status: row.status === 'invalid' ? 'invalid' : 'pricing',
    pricing: EMPTY_PRICING,
    fieldErrors: row.fieldErrors.map(({ path, message }) => ({ path, message })),
    transferId: null,
    shortReference: null,
  }
}

function present(run: StoredRun, now: Date): RunDetail {
  return deriveRun(
    {
      id: run.id,
      fileName: run.fileName,
      createdAt: run.createdAt,
      status: run.status,
      airwallexStatus: run.airwallexStatus,
      sourceCurrency: run.sourceCurrency,
      rows: run.rows.map(publicRow),
      quote: run.quote,
      balance: run.balance,
      error: run.error,
      shortReference: run.shortReference,
      airwallexBatchId: run.airwallexBatchId,
      flags: {
        insufficientBalance: run.flags.insufficientBalance,
        demo: run.flags.demo,
      },
    },
    now.toISOString(),
  )
}

function publicRow(row: StoredRow): RunRow {
  return {
    id: row.id,
    index: row.index,
    contractorName: row.contractorName,
    email: row.email,
    country: row.country,
    currency: row.currency,
    amount: row.amount,
    status: row.status,
    pricing: row.pricing,
    fieldErrors: row.fieldErrors,
    transferId: row.transferId,
    shortReference: row.shortReference,
  }
}

function quoteIsExpired(run: StoredRun, now: Date): boolean {
  return (
    run.status === 'READY' && run.quote !== null && Date.parse(run.quote.expiresAt) <= now.getTime()
  )
}

function assertAction(
  run: RunDetail,
  action: RunDetail['allowedActions'][number],
  message: string,
): void {
  if (!run.allowedActions.includes(action)) throw new ContractError(409, 'INVALID_STATE', message)
}

async function requireRun(id: string): Promise<StoredRun> {
  const run = await findRunById(id)
  if (!run) throw new ContractError(404, 'NOT_FOUND', 'Run not found.')
  return run
}

function dedupe(errors: readonly FieldError[]): FieldError[] {
  const seen = new Set<string>()
  const unique: FieldError[] = []
  for (const error of errors) {
    const key = `${error.path}\u0000${error.message}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(error)
  }
  return unique
}
