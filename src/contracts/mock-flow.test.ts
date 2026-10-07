import { describe, expect, it } from 'vitest'
import { CSV_HEADER, ContractError, SAMPLE_CONTRACTORS_CSV, runProgress } from '@/contracts'
import { createMockDataSource } from '@/mocks/data-source'

function file(name: string, text: string): File {
  return new File([text], name, { type: 'text/csv' })
}

async function codeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise
  } catch (error) {
    expect(error).toBeInstanceOf(ContractError)
    if (error instanceof ContractError) return error.code
  }
  throw new Error('expected a rejection')
}

describe('mock data source', () => {
  it('plays the demo script and rejects a second pay', async () => {
    const data = createMockDataSource()
    expect((await data.listRuns()).map((run) => run.id)).toEqual(['run_inflight', 'run_done'])
    expect((await data.getBalance()).available).toBe('50000.00')

    const before = await data.listRuns()
    expect(await codeOf(data.createRun(file('notes.txt', SAMPLE_CONTRACTORS_CSV)))).toBe('UNSUPPORTED_FILE')
    expect(await data.listRuns()).toEqual(before)

    const pricing = await data.createRun(file('contractors.csv', SAMPLE_CONTRACTORS_CSV))
    expect(pricing.status).toBe('PRICING')
    expect(pricing.poll).toBe(true)
    expect(runProgress(pricing).currentId).toBe('price')
    expect((await data.listRuns())[0]?.id).toBe(pricing.id)

    const ready = await data.getRun(pricing.id)
    expect(ready.id).toBe(pricing.id)
    expect(ready.status).toBe('READY')
    expect(ready.allowedActions).not.toContain('pay')
    expect(ready.allowedActions).toContain('exclude')
    expect(ready.rows.find((row) => row.contractorName === 'Sam Rivera')?.status).toBe('invalid')
    expect((await data.getRun(pricing.id)).status).toBe('READY')

    expect(await codeOf(data.excludeRow(ready.id, 'row_1'))).toBe('INVALID_STATE')
    const clean = await data.excludeRow(ready.id, 'row_7')
    expect(clean.allowedActions).toContain('pay')
    expect(clean.allowedActions).not.toContain('exclude')
    expect(clean.totalPayerPays).toBe('189.60')
    expect(clean.totalSavings).toBe('0.98')
    expect(clean.includedCount).toBe(6)
    expect(clean.rows.find((row) => row.id === 'row_7')?.status).toBe('excluded')

    const live = await data.pay(clean.id)
    expect(live.id).toBe('run_live')
    expect(live.status).toBe('SUBMITTED')
    expect(live.allowedActions).toEqual(['advance'])
    expect(runProgress(live).steps.find((step) => step.id === 'pay')?.detail).toBe('Booking each payout.')
    expect(await codeOf(data.pay(live.id))).toBe('INVALID_STATE')
    expect(await codeOf(data.pay('run_inflight'))).toBe('INVALID_STATE')

    const sent = await data.advance(live.id)
    expect(sent.rows.filter((row) => row.status !== 'excluded').every((row) => row.status === 'sent')).toBe(true)
    expect(runProgress(sent).steps.find((step) => step.id === 'pay')?.detail).toBe('6 of 6 sent.')

    const done = await data.advance(live.id)
    expect(runProgress(done).currentId).toBe('done')
    expect(runProgress(done).steps[4]).toMatchObject({ state: 'failed', detail: '5 of 6 paid.' })
    expect(done.rows.find((row) => row.contractorName === 'Priya Nair')).toMatchObject({
      status: 'failed',
      fieldErrors: [{ message: 'The beneficiary bank rejected the payout.' }],
    })
    expect(done.rows.filter((row) => row.status === 'paid')).toHaveLength(5)
    expect(done.allowedActions).not.toContain('advance')
    expect(done.settled).toBe(true)
    expect(await codeOf(data.advance(live.id))).toBe('INVALID_STATE')

    await data.reset()
    expect((await data.listRuns()).map((run) => run.id)).toEqual(['run_inflight', 'run_done'])
    expect(await codeOf(data.getRun(pricing.id))).toBe('NOT_FOUND')
    expect(await codeOf(data.getRun('run_live'))).toBe('NOT_FOUND')
  })

  it('refreshes an expired quote and rejects a short wallet', async () => {
    const data = createMockDataSource()
    expect(await codeOf(data.pay('run_expired'))).toBe('QUOTE_EXPIRED')
    const refreshed = await data.requote('run_expired')
    expect(refreshed.quoteExpired).toBe(false)
    expect(refreshed.allowedActions).toContain('pay')

    expect(await codeOf(data.pay('run_short'))).toBe('INSUFFICIENT_BALANCE')
    expect(await codeOf(data.getRun('missing'))).toBe('NOT_FOUND')

    const other = await data.createRun(
      file('one.csv', `${CSV_HEADER.join(',')}\nMaya Chen,maya.chen@example.com,1991-04-12,US,USD,10.00,1 Main,Austin,TX,78701,50001121,,aba,021000021,CHASUS33\n`),
    )
    expect(other.status).toBe('PRICING')
    expect((await data.getRun(other.id)).status).toBe('PRICING')

    const discarded = await data.discard('run_ready')
    expect(discarded.status).toBe('DISCARDED')
    expect(runProgress(discarded).steps.find((step) => step.id === 'review')?.detail).toBe(
      'Draft discarded. Nothing was paid.',
    )
  })
})
