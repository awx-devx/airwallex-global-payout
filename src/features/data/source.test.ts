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

  it('refuses the api source until that source exists', () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = 'api'
    expect(() => getDataSource()).toThrow(/api data source/)
  })
})
