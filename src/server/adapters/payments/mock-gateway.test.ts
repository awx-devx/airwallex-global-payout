import { describe, expect, it } from 'vitest'
import { balanceOk, runReady } from '@/mocks'
import { createMockGateway } from '@/server/adapters/payments/mock-gateway'
import type { BatchItemDraft } from '@/server/adapters/payments/gateway'

const PEOPLE = [
  { row: '1', currency: 'USD', amount: '42.00', swift: true },
  { row: '2', currency: 'GBP', amount: '31.00', swift: true },
  { row: '3', currency: 'EUR', amount: '28.00', swift: true },
  { row: '4', currency: 'AUD', amount: '36.00', swift: true },
  { row: '5', currency: 'SGD', amount: '41.00', swift: true },
  { row: '6', currency: 'INR', amount: '1850.00', swift: false },
] as const

describe('mock payments gateway', () => {
  it('returns the section 8 balance and the ready quote for the sample corridors', async () => {
    const gateway = createMockGateway({ now: () => new Date('2026-04-02T18:00:00.000Z') })
    expect(await gateway.currentBalance('USD')).toEqual(balanceOk)

    const created = await gateway.createBatch({
      requestId: 'b:run-ready',
      name: 'contractors.csv',
      runId: 'run-ready',
    })
    expect(created.airwallexStatus).toBe('DRAFTING')

    await gateway.addItems(
      created.id,
      PEOPLE.map((person) => probe(person, 'LOCAL')),
    )
    const quote = await gateway.quoteBatch(created.id, 'HR_1')
    expect(quote).toEqual(runReady.quote)
  })

  it('prices both rails and drops deleted probes from the quote', async () => {
    const gateway = createMockGateway()
    const created = await gateway.createBatch({
      requestId: 'b:one',
      name: 'contractors.csv',
      runId: 'one',
    })
    await gateway.addItems(created.id, [probe(PEOPLE[0], 'LOCAL'), probe(PEOPLE[0], 'SWIFT')])
    const items = await gateway.listItems(created.id)
    expect(items.map((item) => item.rail?.amountPayerPays)).toEqual(['42.00', '42.15'])

    const swift = items.find((item) => item.candidate === 'S')
    if (!swift) throw new Error('missing swift probe')
    await gateway.deleteItems(created.id, [swift.airwallexItemId])
    const quote = await gateway.quoteBatch(created.id, 'HR_1')
    expect(quote.payerPays).toBe('42.00')
    expect(quote.lines).toHaveLength(1)
  })

  it('rejects a second create and keeps the first batch', async () => {
    const gateway = createMockGateway()
    const input = { requestId: 'b:same', name: 'contractors.csv', runId: 'same' }
    const created = await gateway.createBatch(input)
    await gateway.addItems(created.id, [probe(PEOPLE[0], 'LOCAL')])

    await expect(gateway.createBatch(input)).rejects.toMatchObject({
      code: 'batch_request_id_duplicate',
    })
    expect(await gateway.findBatchByRequestId(input.requestId)).toEqual(created)
    expect(await gateway.listItems(created.id)).toHaveLength(1)
  })
})

function probe(
  person: { row: string; currency: string; amount: string },
  method: 'LOCAL' | 'SWIFT',
): BatchItemDraft {
  return {
    requestId: `i:run:${person.row}:${method === 'LOCAL' ? 'L' : 'S'}`,
    transferMethod: method,
    sourceCurrency: 'USD',
    transferCurrency: person.currency,
    transferAmount: person.amount,
    reference: `PAY-${person.row}`,
    metadata: { row: person.row, candidate: method === 'LOCAL' ? 'L' : 'S' },
    beneficiary: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      dateOfBirth: '1990-01-02',
      address: {
        street: '1 Main',
        city: 'Austin',
        state: 'TX',
        postcode: '78701',
        countryCode: 'US',
      },
      accountName: 'Ada Lovelace',
      accountCurrency: person.currency,
      bankCountryCode: 'US',
    },
  }
}
