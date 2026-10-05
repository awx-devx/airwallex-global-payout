import { describe, expect, it } from 'vitest'
import { contrastRatio } from './contrast'

describe('contrastRatio', () => {
  it('clears 4.5:1 for the body text pairs on the sheet', () => {
    expect(contrastRatio('#F4F4F6', '#0C0C11')).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio('#A6A6B3', '#0C0C11')).toBeGreaterThanOrEqual(4.5)
  })
})
