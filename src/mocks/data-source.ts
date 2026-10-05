import {
  ContractError,
  SAMPLE_CONTRACTORS_CSV,
  deriveRun,
  parseContractorCsv,
  toRunDraft,
  toRunSummary,
} from '@/contracts'
import type { Balance, DataSource, ParsedRow, RunDetail, RunRow, RunSummary } from '@/contracts'
import {
  FIXTURE_IDS,
  MOCK_CLOCK,
  READY_EXPIRES_AT,
  REJECTED_PAYOUT_MESSAGE,
  balanceOk,
  fixtureRuns,
  runInflight,
  runReady,
} from './fixtures'

const FIXTURE_ID_SET = new Set<string>(FIXTURE_IDS)
const UNPRICED: RunRow['pricing'] = { chosen: null, alternatives: [], savings: null }

function defaultDelay(): number {
  if (typeof process !== 'undefined' && process.env.VITEST) return 0
  return 400
}

function normalizeCsv(text: string): string {
  return text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
}

const SAMPLE_NORMALIZED = normalizeCsv(SAMPLE_CONTRACTORS_CSV)

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function invalidState(): ContractError {
  return new ContractError(409, 'INVALID_STATE', 'That action is not available on this payout.')
}

function moneyOrZero(value: string): string {
  return /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value) ? value : '0.00'
}

function rowFromParsed(parsed: ParsedRow): RunRow {
  return {
    id: parsed.id,
    index: parsed.index,
    contractorName: parsed.contractorName,
    email: parsed.email,
    country: parsed.country,
    currency: parsed.currency,
    amount: moneyOrZero(parsed.amount),
    status: parsed.status === 'invalid' ? 'invalid' : 'pricing',
    pricing: UNPRICED,
    fieldErrors: parsed.fieldErrors.map((error) => ({ path: error.path, message: error.message })),
    transferId: null,
    shortReference: null,
  }
}

function isScripted(run: RunDetail): boolean {
  return run.rows.map((row) => row.contractorName).join('|') === runReady.rows.map((row) => row.contractorName).join('|')
}

export function createMockDataSource(options?: { delayMs?: number }): DataSource {
  const delayMs = options?.delayMs ?? defaultDelay()
  let runs = new Map<string, RunDetail>()
  let listed = new Set<string>()
  let pendingReady = new Set<string>()
  let advanceStep = new Map<string, number>()
  let balance: Balance = structuredClone(balanceOk)

  const seed = () => {
    runs = new Map(
      Object.values(fixtureRuns).map((run) => [run.id, structuredClone(run) as RunDetail]),
    )
    listed = new Set(['run_inflight', 'run_done'])
    pendingReady = new Set()
    advanceStep = new Map()
    balance = structuredClone(balanceOk)
  }

  const persist = (run: RunDetail): RunDetail => {
    runs.set(run.id, run)
    return structuredClone(run) as RunDetail
  }

  const requireRun = (id: string): RunDetail => {
    const run = runs.get(id)
    if (!run) throw new ContractError(404, 'NOT_FOUND', 'This payout does not exist.')
    return run
  }

  seed()

  return {
    async listRuns(): Promise<RunSummary[]> {
      return [...listed]
        .flatMap((id) => {
          const run = runs.get(id)
          return run ? [toRunSummary(run)] : []
        })
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id))
    },

    async getRun(id: string): Promise<RunDetail> {
      const current = requireRun(id)
      if (!pendingReady.has(id)) return structuredClone(current) as RunDetail
      pendingReady.delete(id)
      const draft = structuredClone(toRunDraft(runReady)) 
      draft.id = current.id
      draft.fileName = current.fileName
      draft.createdAt = current.createdAt
      return persist(deriveRun(draft, MOCK_CLOCK))
    },

    async createRun(file: File): Promise<RunDetail> {
      await delay(delayMs)
      const text = await file.text()
      const parsed = parseContractorCsv({
        text,
        fileName: file.name,
        byteLength: file.size,
      })
      if (!parsed.ok) throw new ContractError(400, parsed.code, parsed.message)

      const id = crypto.randomUUID()
      const created = deriveRun(
        {
          id,
          fileName: file.name,
          createdAt: MOCK_CLOCK,
          status: 'PRICING',
          airwallexStatus: null,
          sourceCurrency: 'USD',
          rows: parsed.rows.map(rowFromParsed),
          quote: null,
          balance: structuredClone(balanceOk),
          error: null,
          shortReference: null,
          airwallexBatchId: null,
          flags: { insufficientBalance: false, demo: true },
        },
        MOCK_CLOCK,
      )
      // DEMO-ONLY: only the sample file promotes to the ready fixture on the next read.
      // PROD: every accepted file is priced through Airwallex.
      if (normalizeCsv(text) === SAMPLE_NORMALIZED) pendingReady.add(id)
      listed.add(id)
      return persist(created)
    },

    async pay(id: string): Promise<RunDetail> {
      const current = requireRun(id)
      if (current.status === 'SUBMITTED') throw invalidState()
      if (current.quoteExpired) {
        throw new ContractError(409, 'QUOTE_EXPIRED', 'Quote expired. Refresh it to pay.')
      }
      if (current.flags.insufficientBalance) {
        throw new ContractError(409, 'INSUFFICIENT_BALANCE', 'The wallet does not cover this payout.')
      }
      if (!current.allowedActions.includes('pay')) throw invalidState()

      const scripted = isScripted(current)
      const draft = structuredClone(toRunDraft(scripted ? runInflight : current))
      draft.id = 'run_live'
      draft.fileName = current.fileName
      draft.createdAt = current.createdAt
      if (scripted) {
        draft.shortReference = 'B-run_live'
        draft.airwallexBatchId = 'bat_run_live'
        for (const row of draft.rows) {
          if (row.transferId?.includes('run_inflight')) {
            row.transferId = row.transferId.replace('run_inflight', 'run_live')
          }
        }
      }
      if (!scripted) {
        draft.status = 'SUBMITTED'
        draft.airwallexStatus = 'BOOKING'
        draft.quote = null
        draft.shortReference = 'B-run_live'
        draft.airwallexBatchId = 'bat_run_live'
        for (const row of draft.rows) {
          if (row.status === 'excluded' || row.status === 'invalid') continue
          row.status = 'booking'
          row.transferId = `tr_run_live_${row.id}`
        }
      }
      const live = deriveRun(draft, MOCK_CLOCK)
      if (!FIXTURE_ID_SET.has(id)) {
        runs.delete(id)
        listed.delete(id)
        pendingReady.delete(id)
      }
      listed.add('run_live')
      advanceStep.set('run_live', 0)
      return persist(live)
    },

    async requote(id: string): Promise<RunDetail> {
      const current = requireRun(id)
      if (!current.allowedActions.includes('requote') || !current.quote) throw invalidState()
      const draft = structuredClone(toRunDraft(current))
      if (!draft.quote) throw invalidState()
      draft.quote.expiresAt = READY_EXPIRES_AT
      return persist(deriveRun(draft, MOCK_CLOCK))
    },

    async discard(id: string): Promise<RunDetail> {
      const current = requireRun(id)
      if (!current.allowedActions.includes('discard')) throw invalidState()
      const draft = structuredClone(toRunDraft(current))
      draft.status = 'DISCARDED'
      pendingReady.delete(id)
      return persist(deriveRun(draft, MOCK_CLOCK))
    },

    async excludeRow(id: string, rowId: string): Promise<RunDetail> {
      const current = requireRun(id)
      if (!current.allowedActions.includes('exclude')) throw invalidState()
      const draft = structuredClone(toRunDraft(current))
      const row = draft.rows.find((item) => item.id === rowId)
      if (!row) throw new ContractError(404, 'NOT_FOUND', 'This contractor is not on the payout.')
      if (row.status !== 'invalid' && row.status !== 'needs_fix') throw invalidState()
      row.status = 'excluded'
      return persist(deriveRun(draft, MOCK_CLOCK))
    },

    async getBalance(): Promise<Balance> {
      return structuredClone(balance)
    },

    async advance(id: string): Promise<RunDetail> {
      const current = requireRun(id)
      if (!current.allowedActions.includes('advance')) throw invalidState()
      // DEMO-ONLY: Advance jumps transfer statuses for the talk track.
      // PROD: no advance control; status comes from webhooks and retrieve.
      const draft = structuredClone(toRunDraft(current))
      const step = advanceStep.get(id) ?? 0
      for (const row of draft.rows) {
        if (row.status === 'excluded') continue
        row.shortReference = row.shortReference ?? `S${row.index}`
        if (step === 0) {
          row.status = 'sent'
          row.fieldErrors = []
        } else if (row.contractorName === 'Priya Nair') {
          row.status = 'failed'
          row.fieldErrors = [{ path: 'row', message: REJECTED_PAYOUT_MESSAGE }]
        } else {
          row.status = 'paid'
          row.fieldErrors = []
        }
      }
      draft.airwallexStatus = 'BOOKED'
      advanceStep.set(id, step + 1)
      return persist(deriveRun(draft, MOCK_CLOCK))
    },

    async reset(): Promise<void> {
      seed()
    },
  }
}

export const mockDataSource = createMockDataSource()
