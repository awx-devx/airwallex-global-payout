import { z } from 'zod'
import {
  BalanceSchema,
  ContractError,
  ErrorEnvelopeSchema,
  RunDetailSchema,
  RunSummarySchema,
  type DataSource,
} from '@/contracts'

const RunListSchema = z.object({ runs: z.array(RunSummarySchema) })
const ResetSchema = z.object({ ok: z.literal(true) })

export function createApiDataSource(fetchImpl: typeof fetch = fetch): DataSource {
  return {
    listRuns: async () => (await send(fetchImpl, '/api/runs', RunListSchema)).runs,
    getRun: (id) => send(fetchImpl, `/api/runs/${encodeURIComponent(id)}`, RunDetailSchema),
    createRun: (file) => {
      const form = new FormData()
      form.set('file', file)
      return send(fetchImpl, '/api/runs', RunDetailSchema, { method: 'POST', body: form })
    },
    pay: (id) =>
      send(fetchImpl, `/api/runs/${encodeURIComponent(id)}/pay`, RunDetailSchema, {
        method: 'POST',
      }),
    requote: (id) =>
      send(fetchImpl, `/api/runs/${encodeURIComponent(id)}/requote`, RunDetailSchema, {
        method: 'POST',
      }),
    discard: (id) =>
      send(fetchImpl, `/api/runs/${encodeURIComponent(id)}/discard`, RunDetailSchema, {
        method: 'POST',
      }),
    excludeRow: (id, rowId) =>
      send(
        fetchImpl,
        `/api/runs/${encodeURIComponent(id)}/rows/${encodeURIComponent(rowId)}/exclude`,
        RunDetailSchema,
        { method: 'POST' },
      ),
    getBalance: () => send(fetchImpl, '/api/balance', BalanceSchema),
    advance: (id) =>
      send(fetchImpl, `/api/demo/runs/${encodeURIComponent(id)}/advance`, RunDetailSchema, {
        method: 'POST',
      }),
    reset: async () => {
      await send(fetchImpl, '/api/demo/reset', ResetSchema, { method: 'POST' })
    },
  }
}

async function send<T>(
  fetchImpl: typeof fetch,
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetchImpl(path, init)
  let body: unknown = null
  const text = await response.text()
  if (text !== '') {
    try {
      body = JSON.parse(text) as unknown
    } catch {
      body = null
    }
  }
  if (!response.ok) {
    const envelope = ErrorEnvelopeSchema.safeParse(body)
    if (envelope.success) {
      throw new ContractError(
        response.status,
        envelope.data.error.code,
        envelope.data.error.message,
        envelope.data.error.fieldErrors,
      )
    }
    if (response.status === 404) {
      throw new ContractError(404, 'NOT_FOUND', 'This payout does not exist.')
    }
    throw new ContractError(response.status, 'AIRWALLEX_ERROR', 'Something went wrong.')
  }
  return schema.parse(body)
}
