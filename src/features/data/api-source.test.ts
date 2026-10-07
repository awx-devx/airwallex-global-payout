import { describe, expect, it } from 'vitest'
import { ContractError } from '@/contracts'
import { createApiDataSource } from './api-source'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('createApiDataSource', () => {
  it('maps an upload envelope onto the file error', async () => {
    const source = createApiDataSource(async () =>
      jsonResponse(400, {
        error: {
          code: 'UNSUPPORTED_FILE',
          message: 'Upload a CSV with the contractor header.',
        },
      }),
    )
    await expect(source.createRun(new File(['x'], 'notes.txt'))).rejects.toMatchObject({
      name: 'ContractError',
      status: 400,
      code: 'UNSUPPORTED_FILE',
      message: 'Upload a CSV with the contractor header.',
    })
  })

  it('throws AIRWALLEX_ERROR and returns no run when pay fails', async () => {
    const source = createApiDataSource(async () =>
      jsonResponse(502, {
        error: { code: 'AIRWALLEX_ERROR', message: 'The batch could not be booked.' },
      }),
    )
    const error = await source.pay('run_ready').catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ContractError)
    expect(error).toMatchObject({
      status: 502,
      code: 'AIRWALLEX_ERROR',
      message: 'The batch could not be booked.',
    })
  })

  it('keeps quote and balance failures as their own codes', async () => {
    const source = createApiDataSource(async (path) => {
      const code = String(path).endsWith('/requote') ? 'QUOTE_EXPIRED' : 'INSUFFICIENT_BALANCE'
      return jsonResponse(409, { error: { code, message: code } })
    })
    await expect(source.pay('run_ready')).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' })
    await expect(source.requote('run_ready')).rejects.toMatchObject({ code: 'QUOTE_EXPIRED' })
  })

  it('treats a missing run as NOT_FOUND and a broken body as a safe failure', async () => {
    const missing = createApiDataSource(async () => new Response('', { status: 404 }))
    await expect(missing.getRun('nope')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    })

    const broken = createApiDataSource(async () => new Response('<html>', { status: 502 }))
    await expect(broken.getRun('run_ready')).rejects.toMatchObject({
      status: 502,
      code: 'AIRWALLEX_ERROR',
      message: 'Something went wrong.',
    })
  })
})
