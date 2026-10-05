import { describe, expect, it } from 'vitest'
import { runApproval, runFailed, runReady, runShort } from '@/mocks/fixtures'
import { runBanner } from './banner'

describe('runBanner', () => {
  it('follows error, approval, balance, then attention', () => {
    expect(runBanner(runFailed)?.tone).toBe('down')
    expect(runBanner(runFailed)?.message).toBe(runFailed.error?.message)
    expect(runBanner(runApproval)?.message).toBe(
      'Waiting for approval in Airwallex. This demo cannot approve it.',
    )
    expect(runBanner(runShort)?.message).toContain('wallet is short')
    expect(runBanner(runReady)?.message).toBe('Exclude the rows with errors first.')
  })
})
