import { describe, expect, it } from 'vitest'
import { formatRunDate } from './date'

describe('formatRunDate', () => {
  it('formats an absolute UTC date', () => {
    expect(formatRunDate('2026-04-02T16:00:00.000Z')).toBe('2 Apr 2026')
    expect(formatRunDate('2026-04-02T00:30:00.000Z')).toBe('2 Apr 2026')
  })

  it('renders a dash for an invalid timestamp', () => {
    expect(formatRunDate('not-a-date')).toBe('—')
  })
})
