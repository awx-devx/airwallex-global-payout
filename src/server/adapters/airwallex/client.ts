import { csvPathForAirwallexSource } from '@/contracts'
import type { FieldError } from '@/contracts'
import { AirwallexError } from '@/server/adapters/airwallex/errors'
import { parseJsonLossless } from '@/server/adapters/airwallex/json'
import {
  createRateLimiter,
  retryDelayMs,
  type RateLimiter,
} from '@/server/adapters/airwallex/limiter'
import type { BatchCreatePayload } from '@/server/adapters/airwallex/payload'
import type {
  AirwallexBalance,
  AirwallexBatch,
  AirwallexItem,
  AirwallexQuoteResponse,
  AirwallexTransfer,
} from '@/server/adapters/airwallex/types'
import type {
  CallContext,
  QuoteValidity,
  SimulationStatus,
} from '@/server/adapters/payments/gateway'
import { logger } from '@/server/logger'
import { getServerEnv } from '@/server/env'

const MAX_ATTEMPTS = 5
const REFRESH_BEFORE_MS = 60_000
const REQUEST_TIMEOUT_MS = 30_000

export type AirwallexFetch = (url: string, init: RequestInit) => Promise<Response>

type Session = { token: string; expiresAtMs: number }

export type AirwallexClient = {
  login(): Promise<Session>
  balances(context?: CallContext): Promise<AirwallexBalance[]>
  createBatch(body: BatchCreatePayload, context?: CallContext): Promise<AirwallexBatch>
  listBatches(requestId: string, context?: CallContext): Promise<AirwallexBatch[]>
  addItems(batchId: string, body: { items: unknown[] }, context?: CallContext): Promise<void>
  listItems(batchId: string, context?: CallContext): Promise<AirwallexItem[]>
  deleteItems(batchId: string, itemIds: readonly string[], context?: CallContext): Promise<void>
  quote(
    batchId: string,
    validity: QuoteValidity,
    context?: CallContext,
  ): Promise<AirwallexQuoteResponse>
  submit(batchId: string, context?: CallContext): Promise<AirwallexBatch | null>
  getBatch(batchId: string, context?: CallContext): Promise<AirwallexBatch>
  deleteBatch(batchId: string, context?: CallContext): Promise<void>
  getTransfer(transferId: string, context?: CallContext): Promise<AirwallexTransfer>
  transitionTransfer(
    transferId: string,
    nextStatus: SimulationStatus,
    context?: CallContext,
  ): Promise<void>
  // AIRWALLEX: smoke-only. Pricing does not call this.
  // https://www.airwallex.com/docs/payouts/beneficiaries/using-api-and-form-schemas.md
  beneficiarySchema(query: BeneficiarySchemaQuery, context?: CallContext): Promise<unknown>
}

export type BeneficiarySchemaQuery = {
  account_currency: string
  bank_country_code: string
  country_code: string
  entity_type: 'PERSONAL'
  transfer_method: 'LOCAL' | 'SWIFT'
}

export type AirwallexClientOptions = {
  fetch: AirwallexFetch
  baseUrl: string
  clientId: string
  apiKey: string
  apiVersion: string
  env: 'sandbox' | 'production'
  now?: () => number
  sleep?: (ms: number) => Promise<void>
  random?: () => number
  limiter?: RateLimiter
  timeoutMs?: number
}

export function createAirwallexClient(options: AirwallexClientOptions): AirwallexClient {
  const fetchImpl = options.fetch
  const baseUrl = options.baseUrl.replace(/\/$/, '')
  const now = options.now ?? (() => Date.now())
  const sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)))
  const random = options.random ?? Math.random
  const limiter = options.limiter ?? createRateLimiter({ now, sleep })
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS

  let session: Session | null = null
  let loginInflight: Promise<Session> | null = null

  async function ensureSession(force: boolean): Promise<Session> {
    if (!force && session && now() < session.expiresAtMs - REFRESH_BEFORE_MS) return session
    if (!loginInflight) {
      loginInflight = requestLogin().finally(() => {
        loginInflight = null
      })
    }
    return loginInflight
  }

  async function requestLogin(): Promise<Session> {
    const body = await send('POST', '/api/v1/authentication/login', {
      auth: 'key',
      route: 'POST /api/v1/authentication/login',
    })
    const record = readRecord(body, 'login')
    const token = readString(record.token, 'login token')
    const expiresAt = readString(record.expires_at, 'login expires_at')
    const expiresAtMs = Date.parse(expiresAt)
    if (Number.isNaN(expiresAtMs)) throw new Error(`Invalid login expires_at ${expiresAt}`)
    session = { token, expiresAtMs }
    return session
  }

  async function bearer(force: boolean): Promise<string> {
    const next = await ensureSession(force)
    return next.token
  }

  async function send(
    method: string,
    path: string,
    input: {
      auth: 'key' | 'bearer'
      route: string
      body?: unknown
      context?: CallContext
      token?: string
    },
  ): Promise<unknown> {
    const url = `${baseUrl}${path}`
    let refreshed = false
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      await limiter.acquire(input.route)
      const started = now()
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      let response: Response
      try {
        response = await fetchImpl(url, {
          method,
          signal: controller.signal,
          headers: headers(input.auth, input.token, input.body !== undefined),
          body: input.body === undefined ? undefined : JSON.stringify(input.body),
        })
      } catch (error) {
        clearTimeout(timer)
        log(method, path, 0, null, now() - started, input.context)
        if (attempt === MAX_ATTEMPTS - 1) {
          throw new AirwallexError({
            status: 0,
            code: 'timeout',
            message: error instanceof Error ? error.message : 'Airwallex request failed',
            source: null,
            fieldErrors: [],
            traceId: null,
          })
        }
        await sleep(retryDelayMs(attempt, random))
        continue
      }
      clearTimeout(timer)
      const text = await response.text()
      const traceId = traceOf(response, text)
      log(method, path, response.status, traceId, now() - started, input.context)

      if (response.status === 401 && input.auth === 'bearer' && !refreshed) {
        refreshed = true
        session = null
        input.token = await bearer(true)
        attempt -= 1
        continue
      }
      if (retryable(response.status)) {
        if (attempt === MAX_ATTEMPTS - 1) throw await httpError(response.status, text, traceId)
        await sleep(retryDelayMs(attempt, random))
        continue
      }
      if (!response.ok) throw await httpError(response.status, text, traceId)
      if (text.trim() === '') return null
      return parseJsonLossless(text)
    }
    throw new AirwallexError({
      status: 0,
      code: 'timeout',
      message: 'Airwallex request failed',
      source: null,
      fieldErrors: [],
      traceId: null,
    })
  }

  function headers(auth: 'key' | 'bearer', token: string | undefined, hasBody: boolean): Headers {
    const result = new Headers()
    if (auth === 'key') {
      result.set('x-client-id', options.clientId)
      result.set('x-api-key', options.apiKey)
      return result
    }
    result.set('Authorization', `Bearer ${token ?? ''}`)
    result.set('x-api-version', options.apiVersion)
    if (hasBody) result.set('Content-Type', 'application/json')
    return result
  }

  async function authed(
    method: string,
    path: string,
    route: string,
    body: unknown,
    context?: CallContext,
  ): Promise<unknown> {
    const token = await bearer(false)
    return send(method, path, { auth: 'bearer', route, body, context, token })
  }

  return {
    login() {
      return ensureSession(true)
    },
    async balances(context) {
      const body = await authed(
        'GET',
        '/api/v1/balances/current',
        'GET /api/v1/balances/current',
        undefined,
        context,
      )
      return readBalances(body)
    },
    async createBatch(body, context) {
      const response = await authed(
        'POST',
        '/api/v1/batch_transfers/create',
        'POST /api/v1/batch_transfers/create',
        body,
        context,
      )
      return readBatch(response)
    },
    async listBatches(requestId, context) {
      const query = new URLSearchParams({ request_id: requestId })
      const body = await authed(
        'GET',
        `/api/v1/batch_transfers?${query}`,
        'GET /api/v1/batch_transfers',
        undefined,
        context,
      )
      const entries = Array.isArray(body) ? body : readRecord(body, 'batches').items
      if (!Array.isArray(entries)) throw new Error('Batch list is missing items')
      return entries.map((entry) => readBatch(entry))
    },
    async addItems(batchId, body, context) {
      await authed(
        'POST',
        `/api/v1/batch_transfers/${encodeURIComponent(batchId)}/add_items`,
        'POST /api/v1/batch_transfers/:id/add_items',
        body,
        context,
      )
    },
    async listItems(batchId, context) {
      const body = await authed(
        'GET',
        `/api/v1/batch_transfers/${encodeURIComponent(batchId)}/items?page_size=1000`,
        'GET /api/v1/batch_transfers/:id/items',
        undefined,
        context,
      )
      return readItems(body)
    },
    async deleteItems(batchId, itemIds, context) {
      await authed(
        'POST',
        `/api/v1/batch_transfers/${encodeURIComponent(batchId)}/delete_items`,
        'POST /api/v1/batch_transfers/:id/delete_items',
        { item_ids: [...itemIds] },
        context,
      )
    },
    async quote(batchId, validity, context) {
      const body = await authed(
        'POST',
        `/api/v1/batch_transfers/${encodeURIComponent(batchId)}/quote`,
        'POST /api/v1/batch_transfers/:id/quote',
        { validity },
        context,
      )
      return readQuote(body)
    },
    async submit(batchId, context) {
      const body = await authed(
        'POST',
        `/api/v1/batch_transfers/${encodeURIComponent(batchId)}/submit`,
        'POST /api/v1/batch_transfers/:id/submit',
        {},
        context,
      )
      if (body == null) return null
      return readBatch(body)
    },
    async getBatch(batchId, context) {
      const body = await authed(
        'GET',
        `/api/v1/batch_transfers/${encodeURIComponent(batchId)}`,
        'GET /api/v1/batch_transfers/:id',
        undefined,
        context,
      )
      return readBatch(body)
    },
    async deleteBatch(batchId, context) {
      await authed(
        'POST',
        `/api/v1/batch_transfers/${encodeURIComponent(batchId)}/delete`,
        'POST /api/v1/batch_transfers/:id/delete',
        {},
        context,
      )
    },
    async getTransfer(transferId, context) {
      const body = await authed(
        'GET',
        `/api/v1/transfers/${encodeURIComponent(transferId)}`,
        'GET /api/v1/transfers/:id',
        undefined,
        context,
      )
      const record = readRecord(body, 'transfer')
      return {
        id: readString(record.id, 'transfer id'),
        status: readString(record.status, 'transfer status'),
      }
    },
    async transitionTransfer(transferId, nextStatus, context) {
      // SANDBOX: POST /api/v1/simulation/transfers/{id}/transition
      // PROD: wait for webhooks and retrieve.
      if (options.env !== 'sandbox') {
        throw new AirwallexError({
          status: 404,
          code: 'sandbox_only',
          message: 'Transfer simulation is only available in the sandbox.',
          source: null,
          fieldErrors: [],
          traceId: null,
        })
      }
      await authed(
        'POST',
        `/api/v1/simulation/transfers/${encodeURIComponent(transferId)}/transition`,
        'POST /api/v1/simulation/transfers/:id/transition',
        { next_status: nextStatus },
        context,
      )
    },
    async beneficiarySchema(query, context) {
      return authed(
        'POST',
        '/api/v1/beneficiary_api_schemas/generate',
        'POST /api/v1/beneficiary_api_schemas/generate',
        query,
        context,
      )
    },
  }
}

export function createAirwallexClientFromEnv(fetchImpl: AirwallexFetch = fetch): AirwallexClient {
  const env = getServerEnv()
  if (!env.AIRWALLEX_CLIENT_ID || !env.AIRWALLEX_API_KEY) {
    throw new Error('AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY are required')
  }
  return createAirwallexClient({
    fetch: fetchImpl,
    baseUrl: env.AIRWALLEX_BASE_URL,
    clientId: env.AIRWALLEX_CLIENT_ID,
    apiKey: env.AIRWALLEX_API_KEY,
    apiVersion: env.AIRWALLEX_API_VERSION,
    env: env.AIRWALLEX_ENV,
  })
}

function retryable(status: number): boolean {
  return status === 408 || status === 429 || status >= 500
}

function log(
  method: string,
  path: string,
  status: number,
  traceId: string | null,
  latencyMs: number,
  context?: CallContext,
) {
  logger.info(
    { method, path, status, trace_id: traceId, latencyMs, runId: context?.runId ?? null },
    'airwallex request',
  )
}

function traceOf(response: Response, text: string): string | null {
  const header = response.headers.get('x-trace-id')
  if (header) return header
  if (text.trim() === '') return null
  try {
    const body = parseJsonLossless(text)
    if (typeof body === 'object' && body !== null && 'trace_id' in body) {
      const value = (body as { trace_id?: unknown }).trace_id
      if (typeof value === 'string') return value
    }
  } catch {
    return null
  }
  return null
}

async function httpError(
  status: number,
  text: string,
  traceId: string | null,
): Promise<AirwallexError> {
  let code = 'airwallex_error'
  let message = `Airwallex returned ${status}`
  let source: string | null = null
  const fieldErrors: FieldError[] = []
  if (text.trim() !== '') {
    try {
      const body = parseJsonLossless(text)
      if (typeof body === 'object' && body !== null) {
        const record = body as Record<string, unknown>
        if (typeof record.code === 'string') code = record.code
        if (typeof record.message === 'string') message = record.message
        if (typeof record.source === 'string') {
          source = record.source
          fieldErrors.push({ path: csvPathForAirwallexSource(source), message })
        }
        if (typeof record.trace_id === 'string') traceId = record.trace_id
      }
    } catch {
      message = text.slice(0, 200)
    }
  }
  return new AirwallexError({ status, code, message, source, fieldErrors, traceId })
}

function readBalances(value: unknown): AirwallexBalance[] {
  const entries = Array.isArray(value) ? value : readRecord(value, 'balances').items
  if (!Array.isArray(entries)) throw new Error('Balance response is missing items')
  return entries.map((entry) => {
    const record = readRecord(entry, 'balance')
    return {
      currency: readString(record.currency, 'balance currency'),
      available_amount: readString(record.available_amount, 'available_amount'),
      pending_amount: readString(record.pending_amount, 'pending_amount'),
    }
  })
}

function readBatch(value: unknown): AirwallexBatch {
  const record = readRecord(value, 'batch')
  return {
    id: readString(record.id, 'batch id'),
    status: readString(record.status, 'batch status'),
    short_reference_id:
      record.short_reference_id == null
        ? null
        : readString(record.short_reference_id, 'short_reference_id'),
    quote_summary: record.quote_summary as AirwallexBatch['quote_summary'],
  }
}

function readItems(value: unknown): AirwallexItem[] {
  const entries = Array.isArray(value) ? value : readRecord(value, 'items').items
  if (!Array.isArray(entries)) throw new Error('Item list is missing items')
  return entries as AirwallexItem[]
}

function readQuote(value: unknown): AirwallexQuoteResponse {
  const record = readRecord(value, 'quote')
  const summary = readRecord(record.quote_summary, 'quote_summary')
  return { quote_summary: summary as AirwallexQuoteResponse['quote_summary'] }
}

function readRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Expected ${label} object`)
  }
  return value as Record<string, unknown>
}

function readString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value === '') throw new Error(`Expected ${label}`)
  return value
}
