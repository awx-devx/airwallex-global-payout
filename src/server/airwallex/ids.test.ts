import { describe, expect, it } from 'vitest'
import { batchRequestId, itemRequestId } from '@/server/airwallex/ids'

const RUN_ID = '123e4567-e89b-42d3-a456-426614174000'

describe('request id builders', () => {
  it('stays within 64 characters and does not change between calls', () => {
    const batch = batchRequestId(RUN_ID)
    const local = itemRequestId(RUN_ID, 1, 'L')
    const swift = itemRequestId(RUN_ID, 25, 'S')

    expect(batch).toBe(`b:${RUN_ID}`)
    expect(local).toBe(`i:${RUN_ID}:1:L`)
    expect(swift).toBe(`i:${RUN_ID}:25:S`)
    expect(batch.length).toBeLessThanOrEqual(64)
    expect(local.length).toBeLessThanOrEqual(64)
    expect(swift.length).toBeLessThanOrEqual(64)
    expect(batchRequestId(RUN_ID)).toBe(batch)
    expect(itemRequestId(RUN_ID, 25, 'S')).toBe(swift)
  })

  it('rejects a non-uuid and a row index outside 1..25', () => {
    expect(() => batchRequestId('run-1')).toThrow(/UUID/)
    expect(() => itemRequestId(RUN_ID, 0, 'L')).toThrow(/rowIndex/)
    expect(() => itemRequestId(RUN_ID, 26, 'S')).toThrow(/rowIndex/)
  })
})
