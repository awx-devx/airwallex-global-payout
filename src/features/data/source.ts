import { MOCK_CLOCK } from '@/mocks/fixtures'
import { createMockDataSource } from '@/mocks/data-source'
import type { DataSource } from '@/contracts'
import { createApiDataSource } from './api-source'

const MOCK_KEY = '__airwallexMockDataSource__'

type MockHost = Window & { [MOCK_KEY]?: DataSource }

export function getDataSource(): DataSource {
  if (process.env.NEXT_PUBLIC_DATA_SOURCE === 'api') return createApiDataSource()
  if (typeof window === 'undefined') return createMockDataSource({ delayMs: 0 })
  const host = window as MockHost
  host[MOCK_KEY] ??= createMockDataSource()
  return host[MOCK_KEY]
}

/** Clock the countdown should trust. The mock quote is priced against the frozen demo clock. */
export function sourceNow(): Date {
  if (process.env.NEXT_PUBLIC_DATA_SOURCE === 'api') return new Date()
  return new Date(MOCK_CLOCK)
}
