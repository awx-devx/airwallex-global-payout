import { describe, expect, it } from 'vitest'
import { parseEnvText } from '@/server/env-file'

describe('parseEnvText', () => {
  it('strips inline comments and keeps quoted hashes', () => {
    const parsed = parseEnvText(`
# comment
AIRWALLEX_ENV=sandbox                     # sandbox | production
AIRWALLEX_API_KEY=
NOTE="keep # hash"
export SOURCE_CURRENCY=USD
`)
    expect(parsed.AIRWALLEX_ENV).toBe('sandbox')
    expect(parsed.AIRWALLEX_API_KEY).toBe('')
    expect(parsed.NOTE).toBe('keep # hash')
    expect(parsed.SOURCE_CURRENCY).toBe('USD')
  })
})
