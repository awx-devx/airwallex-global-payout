import { describe, expect, it } from 'vitest'
import { POST as createRun, GET as listRuns } from '@/app/api/runs/route'
import { GET as getRun } from '@/app/api/runs/[id]/route'
import { GET as getBalance } from '@/app/api/balance/route'
import { SAMPLE_CONTRACTORS_CSV } from '@/contracts'

describe('run routes', () => {
  it('creates a run from the sample file and lists it newest first', async () => {
    const form = new FormData()
    form.set('file', new File([SAMPLE_CONTRACTORS_CSV], 'contractors.csv', { type: 'text/csv' }))
    const created = await createRun(
      new Request('http://localhost/api/runs', { method: 'POST', body: form }),
    )
    expect(created.status).toBe(201)
    const detail = (await created.json()) as {
      id: string
      status: string
      allowedActions: string[]
    }
    expect(detail.status).toBe('READY')
    expect(detail.allowedActions).toEqual(['requote', 'discard', 'exclude'])

    const listed = await listRuns()
    expect(listed.status).toBe(200)
    const body = (await listed.json()) as { runs: Array<{ id: string }> }
    expect(body.runs[0]?.id).toBe(detail.id)

    const loaded = await getRun(new Request('http://localhost/api/runs/' + detail.id), {
      params: Promise.resolve({ id: detail.id }),
    })
    expect(loaded.status).toBe(200)

    const missing = await getRun(new Request('http://localhost/api/runs/missing'), {
      params: Promise.resolve({ id: 'missing-route' }),
    })
    expect(missing.status).toBe(404)
    expect(await missing.json()).toEqual({
      error: { code: 'NOT_FOUND', message: 'Run not found.' },
    })

    const balance = await getBalance()
    expect(balance.status).toBe(200)
    expect(await balance.json()).toEqual({
      currency: 'USD',
      available: '50000.00',
      pending: '0.00',
    })
  })

  it('rejects a file that is not a csv', async () => {
    const form = new FormData()
    form.set('file', new File(['hello'], 'notes.txt', { type: 'text/plain' }))
    const response = await createRun(
      new Request('http://localhost/api/runs', { method: 'POST', body: form }),
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: { code: 'UNSUPPORTED_FILE', message: 'Upload a CSV with the contractor header.' },
    })
  })
})
