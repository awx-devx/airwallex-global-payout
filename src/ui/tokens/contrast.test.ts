import { describe, expect, it } from 'vitest'
import { contrastRatio } from './contrast'

describe('contrastRatio', () => {
  it('clears 4.5:1 for the body text pairs on the sheet', () => {
    expect(contrastRatio('#111111', '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio('#5C5C66', '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio('#3C6B12', '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio('#7C3AED', '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio('#FFFFFF', '#111111')).toBeGreaterThanOrEqual(4.5)
  })
})
