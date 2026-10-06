import { describe, expect, it } from 'vitest'
import {
  allowedActions as contractAllowedActions,
  poll as contractPoll,
  settled as contractSettled,
} from '@/contracts'
import { allowedActions, poll, settled } from '@/server/domain/permissions'

describe('run permissions', () => {
  it('uses the contract functions', () => {
    expect(allowedActions).toBe(contractAllowedActions)
    expect(poll).toBe(contractPoll)
    expect(settled).toBe(contractSettled)
  })

  it('withholds pay on a READY run that needs attention', () => {
    const run = {
      status: 'READY' as const,
      quoteExpired: false,
      rows: [{ status: 'needs_fix' as const }, { status: 'ready' as const }],
      flags: { insufficientBalance: false, demo: false },
    }
    expect(allowedActions(run)).toEqual(['discard', 'exclude'])
    expect(poll(run)).toBe(true)
    expect(settled(run)).toBe(false)
  })
})
