import { afterEach, describe, expect, it } from 'vitest'
import { getDataSource } from './source'

describe('getDataSource', () => {
  const previous = process.env.NEXT_PUBLIC_DATA_SOURCE

  afterEach(() => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = previous
  })

  it('uses the mock unless the public flag is api', async () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = 'mock'
    const source = getDataSource()
    expect((await source.listRuns()).map((run) => run.id)).toEqual(['run_inflight', 'run_done'])
  })

  it('uses the api source when the public flag is api', () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = 'api'
    const source = getDataSource()
    expect(source.advance).toEqual(expect.any(Function))
    expect(source.reset).toEqual(expect.any(Function))
  })
})
