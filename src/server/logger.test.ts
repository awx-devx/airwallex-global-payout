import { Writable } from 'node:stream'
import { describe, expect, it } from 'vitest'
import { createLogger } from '@/server/logger'

const SECRETS = {
  apiKey: 'awxkey-9f3c1a',
  token: 'tok-44ab88',
  account_number: 'acct-8574920133',
  iban: 'iban-DE89370400440532013000',
  routing_value: 'route-021000021',
  authorization: 'auth-header-55',
  apiHeader: 'hdrkey-77cc',
  clientId: 'clientid-abc123',
  rowRouting: 'rowroute-998877',
  rowAccount: 'rowacct-112233',
  rowIban: 'rowiban-GB29NWBK',
  awxRouting: 'awxroute-445566',
} as const

describe('logger redaction', () => {
  it('omits keys, tokens, account numbers, IBANs, and routing values', () => {
    const lines: string[] = []
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        lines.push(chunk.toString())
        callback()
      },
    })
    const log = createLogger(stream)
    const event = {
      runId: 'run_123',
      apiKey: SECRETS.apiKey,
      token: SECRETS.token,
      account_number: SECRETS.account_number,
      iban: SECRETS.iban,
      routing_value: SECRETS.routing_value,
      headers: {
        authorization: SECRETS.authorization,
        'x-api-key': SECRETS.apiHeader,
        'x-client-id': SECRETS.clientId,
      },
      rows: [
        {
          routingValue: SECRETS.rowRouting,
          accountNumber: SECRETS.rowAccount,
          iban: SECRETS.rowIban,
        },
      ],
      beneficiary: {
        bank_details: {
          account_number: SECRETS.account_number,
          iban: SECRETS.iban,
          account_routing_value1: SECRETS.awxRouting,
        },
      },
    }

    log.info(event, 'priced row')

    const output = lines.join('')
    const parsed = JSON.parse(output) as {
      runId?: string
      routing_value?: string
      msg?: string
    }

    expect(parsed.runId).toBe('run_123')
    expect(parsed.msg).toBe('priced row')
    expect(parsed.routing_value).toBe('[Redacted]')
    for (const secret of Object.values(SECRETS)) {
      expect(output).not.toContain(secret)
    }
    expect(event.routing_value).toBe(SECRETS.routing_value)
    expect(event.rows[0]?.routingValue).toBe(SECRETS.rowRouting)
  })
})
