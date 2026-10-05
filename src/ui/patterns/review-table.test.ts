import { describe, expect, it } from 'vitest'
import { orderReviewRows } from './review-table'

describe('orderReviewRows', () => {
  it('keeps file order and moves excluded rows last', () => {
    const ordered = orderReviewRows([
      { status: 'excluded' as const, index: 2 },
      { status: 'ready' as const, index: 3 },
      { status: 'invalid' as const, index: 1 },
    ])
    expect(ordered.map((row) => row.index)).toEqual([1, 3, 2])
  })
})
