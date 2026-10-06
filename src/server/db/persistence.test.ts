import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'
import { beforeAll, describe, expect, it } from 'vitest'
import { connectDb } from '@/server/db/connect'
import { RunModel } from '@/server/db/run-model'
import { findRunById, saveRun, type StoredRun } from '@/server/db/runs'
import { WebhookEventModel } from '@/server/db/webhook-event-model'
import { insertWebhookEvent } from '@/server/db/webhook-events'

describe('run persistence', () => {
  beforeAll(async () => {
    await connectDb()
  })

  it('keeps one runs collection, embeds rows, and indexes createdAt', async () => {
    const db = mongoose.connection.db
    if (!db) throw new Error('expected a database')
    const names = (await db.listCollections().toArray()).map((collection) => collection.name)
    expect(names).toEqual(expect.arrayContaining(['runs', 'webhook_events']))
    expect(RunModel.collection.collectionName).toBe('runs')

    const indexes = await RunModel.collection.indexes()
    expect(indexes).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: { createdAt: -1 } })]),
    )
  })

  it('round-trips 18960.00 as Decimal128', async () => {
    const run = sampleRun(randomUUID())
    await saveRun(run)

    const raw = await RunModel.collection.findOne({
      _id: run.id as unknown as mongoose.Types.ObjectId,
    })
    if (!raw) throw new Error('expected the saved run')
    const payerPays = raw.quote?.payerPays as { _bsontype?: string; toString(): string }
    const rowAmount = raw.rows?.[0]?.amount as { _bsontype?: string; toString(): string }
    expect(payerPays._bsontype).toBe('Decimal128')
    expect(payerPays.toString()).toBe('18960.00')
    expect(rowAmount._bsontype).toBe('Decimal128')
    expect(await RunModel.countDocuments({ _id: run.id })).toBe(1)
    expect(raw.rows).toHaveLength(2)

    const loaded = await findRunById(run.id)
    expect(loaded).toEqual(run)
  })

  it('reuses one connection', async () => {
    const first = await connectDb()
    const second = await connectDb()
    expect(second).toBe(first)
    expect(mongoose.connections.filter((connection) => connection.readyState === 1)).toHaveLength(1)
  })

  it('stores webhook event ids and ignores a duplicate', async () => {
    const eventId = `evt_${randomUUID()}`
    expect(WebhookEventModel.collection.collectionName).toBe('webhook_events')
    expect(await insertWebhookEvent(eventId)).toBe('inserted')
    expect(await insertWebhookEvent(eventId)).toBe('duplicate')

    const stored = await WebhookEventModel.collection.findOne({
      _id: eventId as unknown as mongoose.Types.ObjectId,
    })
    expect(stored?._id).toBe(eventId)
  })
})

function sampleRun(id: string): StoredRun {
  return {
    id,
    fileName: 'contractors.csv',
    createdAt: '2026-04-02T18:00:02.000Z',
    status: 'READY',
    airwallexStatus: 'DRAFTING',
    sourceCurrency: 'USD',
    rows: [
      {
        id: 'row_1',
        index: 1,
        contractorName: 'Ada Lovelace',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        dateOfBirth: '1990-01-02',
        country: 'US',
        currency: 'USD',
        amount: '4200.00',
        street: '1 Main',
        city: 'Austin',
        state: 'TX',
        postcode: '78701',
        accountNumber: '8574920133',
        iban: '',
        routingType: 'aba',
        routingValue: '021000021',
        swiftBic: 'CHASUS33',
        status: 'ready',
        pricing: {
          chosen: {
            transferMethod: 'LOCAL',
            localClearingSystem: 'ACH',
            railLabel: 'ACH',
            amountPayerPays: '4200.00',
            feeAmount: '0.00',
            feeCurrency: 'USD',
            amountBeneficiaryReceives: '4200.00',
            sourceCurrency: 'USD',
            transferCurrency: 'USD',
          },
          alternatives: [
            {
              transferMethod: 'SWIFT',
              localClearingSystem: null,
              railLabel: 'SWIFT',
              amountPayerPays: '4210.50',
              feeAmount: '10.50',
              feeCurrency: 'USD',
              amountBeneficiaryReceives: '4200.00',
              sourceCurrency: 'USD',
              transferCurrency: 'USD',
            },
          ],
          savings: '10.50',
        },
        fieldErrors: [],
        transferId: null,
        shortReference: null,
      },
      {
        id: 'row_2',
        index: 2,
        contractorName: 'Grace Hopper',
        firstName: 'Grace',
        lastName: 'Hopper',
        email: 'grace@example.com',
        dateOfBirth: '1906-12-09',
        country: 'IN',
        currency: 'INR',
        amount: '185000.40',
        street: '12 MG Road',
        city: 'Bengaluru',
        state: '',
        postcode: '560001',
        accountNumber: '1122334455',
        iban: '',
        routingType: 'bank_code',
        routingValue: 'HDFC0000123',
        swiftBic: '',
        status: 'ready',
        pricing: {
          chosen: {
            transferMethod: 'LOCAL',
            localClearingSystem: null,
            railLabel: 'Local',
            amountPayerPays: '2210.40',
            feeAmount: '0.10',
            feeCurrency: 'USD',
            amountBeneficiaryReceives: '185000.40',
            sourceCurrency: 'USD',
            transferCurrency: 'INR',
          },
          alternatives: [],
          savings: null,
        },
        fieldErrors: [{ path: 'amount', message: 'Amount must be a positive number.' }],
        transferId: null,
        shortReference: null,
      },
    ],
    quote: {
      expiresAt: '2026-04-02T19:00:02.000Z',
      validity: 'HR_1',
      payerPays: '18960.00',
      feeAmount: '0.10',
      sourceCurrency: 'USD',
      lines: [
        {
          sourceCurrency: 'USD',
          transferCurrency: 'INR',
          amountPayerPays: '14760.00',
          amountBeneficiaryReceives: '185000.40',
          feeAmount: '0.10',
          clientRate: '12.534000',
          currencyPair: 'USDINR',
        },
      ],
    },
    balance: { currency: 'USD', available: '50000.00', pending: '0.00' },
    error: null,
    shortReference: null,
    airwallexBatchId: 'bat_test',
    flags: { insufficientBalance: false, demo: true },
  }
}
