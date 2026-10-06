import { describe, expect, it } from 'vitest'
import type { AirwallexFetch } from '@/server/adapters/airwallex/client'
import { createAirwallexClient } from '@/server/adapters/airwallex/client'
import { AirwallexError } from '@/server/adapters/airwallex/errors'
import { unverifiedQuoteJson } from '@/server/adapters/airwallex/types'
import { batchCreatePayload } from '@/server/adapters/airwallex/payload'
import type { BatchItemDraft } from '@/server/adapters/payments/gateway'
import { addItemsPayload } from '@/server/adapters/airwallex/payload'

const FUTURE = '2026-04-02T19:00:00.000Z'
const START = Date.parse('2026-04-02T18:00:00.000Z')

function jsonResponse(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

function client(fetchImpl: AirwallexFetch, now: () => number = () => START) {
  return createAirwallexClient({
    fetch: fetchImpl,
    baseUrl: 'https://api.sandbox.airwallex.com',
    clientId: 'client-id',
    apiKey: 'secret-api-key',
    apiVersion: '2026-08-21',
    env: 'sandbox',
    now,
    sleep: async () => undefined,
    random: () => 0,
    limiter: { acquire: async () => undefined },
  })
}

describe('Airwallex client', () => {
  it('logs in once, caches the token, and sends the version header on later calls', async () => {
    const seen: Array<{ url: string; headers: Headers }> = []
    let now = START
    const api = client(
      async (url, init) => {
        seen.push({ url, headers: new Headers(init.headers) })
        if (url.endsWith('/authentication/login')) {
          return jsonResponse(200, {
            token: 'tok-1',
            expires_at: new Date(now + 90_000).toISOString(),
          })
        }
        return jsonResponse(200, [
          { currency: 'USD', available_amount: '10.00', pending_amount: '0.00' },
        ])
      },
      () => now,
    )

    await api.balances()
    await api.balances()
    now += 40_000
    await api.balances()

    const logins = seen.filter((call) => call.url.endsWith('/authentication/login'))
    expect(logins).toHaveLength(2)
    expect(logins[0]?.headers.get('x-api-version')).toBeNull()
    expect(logins[0]?.headers.get('x-api-key')).toBe('secret-api-key')
    expect(logins[0]?.headers.get('x-client-id')).toBe('client-id')
    expect(logins[0]?.headers.get('authorization')).toBeNull()

    const balance = seen.filter((call) => call.url.endsWith('/balances/current'))
    expect(balance).toHaveLength(3)
    expect(balance[0]?.headers.get('x-api-version')).toBe('2026-08-21')
    expect(balance[0]?.headers.get('authorization')).toBe('Bearer tok-1')
    expect(balance[2]?.headers.get('authorization')).toBe('Bearer tok-1')
  })

  it('shares one login across concurrent calls', async () => {
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let logins = 0
    const api = client(async (url) => {
      if (url.endsWith('/authentication/login')) {
        logins += 1
        await gate
        return jsonResponse(200, { token: 'tok', expires_at: FUTURE })
      }
      return jsonResponse(200, [])
    })

    const first = api.balances()
    const second = api.balances()
    release()
    await Promise.all([first, second])
    expect(logins).toBe(1)
  })

  it('retries a 401 once with a new token', async () => {
    let logins = 0
    let balances = 0
    let retriedAuth = ''
    const api = client(async (url, init) => {
      if (url.endsWith('/authentication/login')) {
        logins += 1
        return jsonResponse(200, { token: `tok-${logins}`, expires_at: FUTURE })
      }
      balances += 1
      if (balances === 1) return jsonResponse(401, { code: 'unauthorized', message: 'expired' })
      retriedAuth = new Headers(init.headers).get('authorization') ?? ''
      return jsonResponse(200, [
        { currency: 'USD', available_amount: '1.00', pending_amount: '0.00' },
      ])
    })

    const rows = await api.balances()
    expect(rows[0]?.available_amount).toBe('1.00')
    expect(logins).toBe(2)
    expect(retriedAuth).toBe('Bearer tok-2')
  })

  it('does not login a third time when the retry is also 401', async () => {
    let logins = 0
    const api = client(async (url) => {
      if (url.endsWith('/authentication/login')) {
        logins += 1
        return jsonResponse(200, { token: `tok-${logins}`, expires_at: FUTURE })
      }
      return jsonResponse(401, { code: 'unauthorized', message: 'expired' })
    })

    await expect(api.balances()).rejects.toBeInstanceOf(AirwallexError)
    expect(logins).toBe(2)
  })

  it('retries a 429 and sends the same request_id', async () => {
    const bodies: string[] = []
    let creates = 0
    const api = client(async (url, init) => {
      if (url.endsWith('/authentication/login')) {
        return jsonResponse(200, { token: 'tok', expires_at: FUTURE })
      }
      creates += 1
      bodies.push(String(init.body))
      if (creates === 1) return jsonResponse(429, { message: 'slow down' })
      return jsonResponse(200, { id: 'bat_1', status: 'DRAFTING', short_reference_id: 'B1' })
    })

    const payload = batchCreatePayload({
      requestId: 'b:run-1',
      name: 'contractors.csv',
      runId: 'run-1',
    })
    const batch = await api.createBatch(payload, { runId: 'run-1' })
    expect(batch.id).toBe('bat_1')
    expect(bodies).toHaveLength(2)
    expect(bodies[0]).toBe(bodies[1])
    expect(JSON.parse(bodies[0] ?? '{}')).toEqual({
      request_id: 'b:run-1',
      name: 'contractors.csv',
      metadata: { run_id: 'run-1' },
    })
    expect(JSON.parse(bodies[0] ?? '{}')).not.toHaveProperty('funding_source')
    expect(JSON.parse(bodies[0] ?? '{}')).not.toHaveProperty('transfer_date')
  })

  it('reads quote amounts from the raw JSON body', async () => {
    const api = client(async (url) => {
      if (url.endsWith('/authentication/login')) {
        return jsonResponse(200, { token: 'tok', expires_at: FUTURE })
      }
      return new Response(unverifiedQuoteJson, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })

    const quote = await api.quote('bat_1', 'HR_1')
    expect(quote.quote_summary.quotes[0]?.amount_payer_pays).toBe('18960.10')
    expect(quote.quote_summary.quotes[0]?.fee_amount).toBe('0.10')
  })

  it('refuses transfer simulation outside the sandbox', async () => {
    const api = createAirwallexClient({
      fetch: async () => jsonResponse(200, {}),
      baseUrl: 'https://api.airwallex.com',
      clientId: 'client-id',
      apiKey: 'secret-api-key',
      apiVersion: '2026-08-21',
      env: 'production',
      limiter: { acquire: async () => undefined },
    })
    await expect(api.transitionTransfer('tr_1', 'PAID')).rejects.toMatchObject({
      code: 'sandbox_only',
    })
  })

  it('asks for the beneficiary schema without a local clearing system', async () => {
    let seen = ''
    const api = client(async (url, init) => {
      if (url.endsWith('/authentication/login')) {
        return jsonResponse(200, { token: 'tok', expires_at: FUTURE })
      }
      seen = String(init.body)
      return jsonResponse(200, { fields: [] })
    })
    await api.beneficiarySchema({
      account_currency: 'EUR',
      bank_country_code: 'DE',
      country_code: 'DE',
      entity_type: 'PERSONAL',
      transfer_method: 'LOCAL',
    })
    expect(JSON.parse(seen)).toEqual({
      account_currency: 'EUR',
      bank_country_code: 'DE',
      country_code: 'DE',
      entity_type: 'PERSONAL',
      transfer_method: 'LOCAL',
    })
    expect(seen).not.toContain('local_clearing_system')
  })
})

describe('batch item payload', () => {
  it('omits the local clearing system and sets the SWIFT charge option only on SWIFT', () => {
    const local = draft('LOCAL')
    const swift = draft('SWIFT')
    const body = addItemsPayload([local, swift])
    const [localItem, swiftItem] = body.items
    expect(localItem).not.toHaveProperty('local_clearing_system')
    expect(localItem).not.toHaveProperty('swift_charge_option')
    expect(swiftItem?.swift_charge_option).toBe('PAYER')
    expect(swiftItem?.fee_paid_by).toBe('PAYER')
    expect(swiftItem?.reason).toBe('wages_salary')
    expect(swiftItem?.transfer_amount).toBe('4200.00')
    expect(localItem?.beneficiary.bank_details).not.toHaveProperty('iban')
    expect(swiftItem?.beneficiary.bank_details.swift_code).toBe('CHASUS33')
    expect(localItem?.beneficiary.address.state).toBe('US-TX')
    expect(localItem?.beneficiary.bank_details.bank_account_category).toBe('Checking')
    expect(swiftItem?.beneficiary.bank_details.bank_account_category).toBe('Checking')
  })

  it('drops a local iban when the account number is present', () => {
    const local = draft('LOCAL')
    local.beneficiary.iban = 'GB29NWBK60161331926819'
    local.beneficiary.accountNumber = '31926819'
    local.beneficiary.bankCountryCode = 'GB'
    local.beneficiary.address.countryCode = 'GB'
    local.beneficiary.address.state = ''
    const [item] = addItemsPayload([local]).items
    expect(item?.beneficiary.bank_details).not.toHaveProperty('iban')
    expect(item?.beneficiary.bank_details.account_number).toBe('31926819')
    expect(item?.beneficiary.address).not.toHaveProperty('state')
  })
})

function draft(method: 'LOCAL' | 'SWIFT'): BatchItemDraft {
  return {
    requestId: method === 'LOCAL' ? 'i:run:1:L' : 'i:run:1:S',
    transferMethod: method,
    sourceCurrency: 'USD',
    transferCurrency: 'USD',
    transferAmount: '4200.00',
    reference: 'PAY-1',
    metadata: { row: '1', candidate: method === 'LOCAL' ? 'L' : 'S' },
    beneficiary: {
      firstName: 'Maya',
      lastName: 'Chen',
      email: 'maya.chen@example.com',
      dateOfBirth: '1990-01-02',
      address: {
        street: '1 Main',
        city: 'Austin',
        state: 'TX',
        postcode: '78701',
        countryCode: 'US',
      },
      accountName: 'Maya Chen',
      accountCurrency: 'USD',
      bankCountryCode: 'US',
      accountNumber: '8574920133',
      routingType: 'aba',
      routingValue: '021000021',
      swiftBic: 'CHASUS33',
    },
  }
}
