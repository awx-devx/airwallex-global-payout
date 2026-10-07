import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GET as getBalance } from '@/app/api/balance/route'
import { POST as resetRuns } from '@/app/api/demo/reset/route'
import { POST as advanceRun } from '@/app/api/demo/runs/[id]/advance/route'
import { POST as discardRun } from '@/app/api/runs/[id]/discard/route'
import { POST as payRun } from '@/app/api/runs/[id]/pay/route'
import { POST as requoteRun } from '@/app/api/runs/[id]/requote/route'
import { GET as getRun } from '@/app/api/runs/[id]/route'
import { POST as excludeRow } from '@/app/api/runs/[id]/rows/[rowId]/exclude/route'
import { GET as listRuns, POST as createRun } from '@/app/api/runs/route'
import { ContractError, SAMPLE_CONTRACTORS_CSV, runProgress } from '@/contracts'
import { createApiDataSource } from '@/features/data/api-source'
import { clearServerEnvCache } from '@/server/env'
import { clearRunServiceCache } from '@/server/services/runs'

describe('api demo script', () => {
  beforeEach(async () => {
    process.env.DEMO_MODE = 'true'
    clearServerEnvCache()
    clearRunServiceCache()
    const response = await resetRuns()
    expect(response.status).toBe(200)
  })

  afterEach(() => {
    process.env.DEMO_MODE = 'false'
    clearServerEnvCache()
    clearRunServiceCache()
  })

  it('plays the talk track through the api data source', async () => {
    const data = createApiDataSource(routeFetch)
    const file = new File([SAMPLE_CONTRACTORS_CSV], 'contractors.csv', { type: 'text/csv' })

    await expect(
      data.createRun(new File(['hello'], 'notes.txt', { type: 'text/plain' })),
    ).rejects.toMatchObject({
      code: 'UNSUPPORTED_FILE',
    })

    const ready = await data.createRun(file)
    expect(ready.status).toBe('READY')
    expect(ready.allowedActions).toEqual(['discard', 'exclude'])
    expect(ready.rows.find((row) => row.contractorName === 'Sam Rivera')?.status).toBe('invalid')
    expect(runProgress(ready).currentId).toBe('review')

    const clean = await data.excludeRow(ready.id, 'row_7')
    expect(clean.allowedActions).toContain('pay')
    expect(clean.totalPayerPays).toBe('18960.00')
    expect(clean.includedCount).toBe(6)

    const live = await data.pay(clean.id)
    expect(live.status).toBe('SUBMITTED')
    expect(live.allowedActions).toEqual(['advance'])
    expect(runProgress(live).steps.find((step) => step.id === 'pay')?.detail).toBe(
      'Booking each payout.',
    )
    await expect(data.pay(live.id)).rejects.toMatchObject({ code: 'INVALID_STATE' })

    const sent = await data.advance(live.id)
    expect(
      sent.rows.filter((row) => row.status !== 'excluded').every((row) => row.status === 'sent'),
    ).toBe(true)
    expect(runProgress(sent).steps.find((step) => step.id === 'pay')?.detail).toBe('6 of 6 sent.')

    const done = await data.advance(live.id)
    expect(runProgress(done).currentId).toBe('done')
    expect(runProgress(done).steps[4]).toMatchObject({ state: 'failed', detail: '5 of 6 paid.' })
    expect(done.rows.find((row) => row.contractorName === 'Priya Nair')).toMatchObject({
      status: 'failed',
      fieldErrors: [{ path: 'row', message: 'The beneficiary bank rejected the payout.' }],
    })
    expect(done.rows.filter((row) => row.status === 'paid')).toHaveLength(5)
    expect(done.settled).toBe(true)
    expect(done.poll).toBe(false)
    expect(done.allowedActions).toEqual([])
    await expect(data.advance(live.id)).rejects.toBeInstanceOf(ContractError)
    await expect(data.advance(live.id)).rejects.toMatchObject({ code: 'INVALID_STATE' })

    await data.reset()
    await expect(data.getRun(live.id)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(await data.getBalance()).toMatchObject({ currency: 'USD', available: '50000.00' })
  })

  it('hides the demo routes when demo mode is off', async () => {
    process.env.DEMO_MODE = 'false'
    const advance = await advanceRun(
      new Request('http://localhost/api/demo/runs/run/advance', { method: 'POST' }),
      {
        params: Promise.resolve({ id: 'run' }),
      },
    )
    const reset = await resetRuns()
    expect(advance.status).toBe(404)
    expect(reset.status).toBe(404)
  })
})

function routeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
    'http://localhost',
  )
  const request = new Request(url, init)
  const parts = url.pathname.split('/')
  const id = decodeURIComponent(
    url.pathname.includes('/demo/') ? (parts[4] ?? '') : (parts[3] ?? ''),
  )
  const rowId = decodeURIComponent(parts[5] ?? '')
  if (url.pathname === '/api/runs' && request.method === 'GET') return listRuns()
  if (url.pathname === '/api/runs' && request.method === 'POST') return createRun(request)
  if (url.pathname === '/api/balance') return getBalance()
  if (url.pathname === '/api/demo/reset') return resetRuns()
  if (url.pathname.endsWith('/pay')) return payRun(request, { params: Promise.resolve({ id }) })
  if (url.pathname.endsWith('/requote'))
    return requoteRun(request, { params: Promise.resolve({ id }) })
  if (url.pathname.endsWith('/discard'))
    return discardRun(request, { params: Promise.resolve({ id }) })
  if (url.pathname.endsWith('/advance'))
    return advanceRun(request, { params: Promise.resolve({ id }) })
  if (url.pathname.endsWith('/exclude')) {
    return excludeRow(request, { params: Promise.resolve({ id, rowId }) })
  }
  if (request.method === 'GET') return getRun(request, { params: Promise.resolve({ id }) })
  return Promise.resolve(new Response(null, { status: 404 }))
}
