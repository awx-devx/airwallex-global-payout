import { describe, expect, it } from 'vitest'
import { advanceRouteEnabled } from './demo-access'

describe('advanceRouteEnabled', () => {
  it('stays open in the sandbox when demo mode is off', () => {
    expect(advanceRouteEnabled({ DEMO_MODE: 'false', AIRWALLEX_ENV: 'sandbox' })).toBe(true)
  })

  it('stays closed in production when demo mode is off', () => {
    expect(advanceRouteEnabled({ DEMO_MODE: 'false', AIRWALLEX_ENV: 'production' })).toBe(false)
    expect(advanceRouteEnabled({ DEMO_MODE: 'false' })).toBe(false)
  })

  it('stays open when demo mode is on', () => {
    expect(advanceRouteEnabled({ DEMO_MODE: 'true', AIRWALLEX_ENV: 'production' })).toBe(true)
  })
})
