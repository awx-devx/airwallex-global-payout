import { describe, expect, it } from 'vitest'
import { SAMPLE_CONTRACTORS_CSV } from '@/contracts'
import { createMockDataSource } from '@/mocks/data-source'
import { listRunsForHome } from './home-list'

describe('listRunsForHome', () => {
  it('keeps fixture row statuses and does not promote a pricing upload', async () => {
    const source = createMockDataSource({ delayMs: 0 })
    const listed = await listRunsForHome(source)
    const done = listed.find((run) => run.id === 'run_done')
    expect(done?.rows.some((row) => row.status === 'failed')).toBe(true)
    expect(done?.rows.some((row) => row.status === 'paid')).toBe(true)

    const pricing = await source.createRun(
      new File([SAMPLE_CONTRACTORS_CSV], 'contractors.csv', { type: 'text/csv' }),
    )
    const duringPricing = await listRunsForHome(source)
    expect(duringPricing.find((run) => run.id === pricing.id)?.status).toBe('PRICING')

    const ready = await source.getRun(pricing.id)
    expect(ready.status).toBe('READY')
    expect(ready.rows).toHaveLength(7)
  })
})
