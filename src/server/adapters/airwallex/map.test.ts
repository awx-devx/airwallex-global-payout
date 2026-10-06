import { describe, expect, it } from 'vitest'
import {
  mapBatch,
  mapItem,
  mapQuote,
  mapRowStatus,
  toIsoTimestamp,
} from '@/server/adapters/airwallex/map'
import {
  unverifiedBatch,
  unverifiedBookedItem,
  unverifiedItem,
  unverifiedQuoteJson,
  unverifiedQuoteResponse,
  unverifiedValidatedItem,
} from '@/server/adapters/airwallex/types'
import { parseJsonLossless } from '@/server/adapters/airwallex/json'
import type { AirwallexQuoteResponse } from '@/server/adapters/airwallex/types'

describe('Airwallex mappers', () => {
  it('maps a batch, a failed item, and a priced item', () => {
    expect(mapBatch(unverifiedBatch)).toEqual({
      id: 'bat_unverified',
      airwallexStatus: 'DRAFTING',
      shortReference: 'B-unverified',
    })

    const failed = mapItem(unverifiedItem)
    expect(failed.status).toBe('needs_fix')
    expect(failed.fieldErrors).toEqual([
      { path: 'account_number', message: 'Account number is invalid.' },
    ])
    expect(failed.rail).toBeNull()
    expect(failed.rowIndex).toBe(1)
    expect(failed.candidate).toBe('L')

    const priced = mapItem(unverifiedValidatedItem)
    expect(priced.status).toBe('ready')
    expect(priced.rail).toMatchObject({
      transferMethod: 'SWIFT',
      localClearingSystem: null,
      railLabel: 'SWIFT',
      amountPayerPays: '4215.00',
      feeAmount: '15.00',
      amountBeneficiaryReceives: '4200.00',
    })
  })

  it('prefers transfer_id and keeps a failed row failed when a later event is cancelled', () => {
    expect(mapItem(unverifiedBookedItem).transferId).toBe('tr_booked')
    expect(
      mapItem({ ...unverifiedBookedItem, metadata: undefined, transfer_id: null }).rowIndex,
    ).toBe(2)
    expect(
      mapItem({ ...unverifiedBookedItem, metadata: undefined, transfer_id: null }).candidate,
    ).toBe('L')
    expect(mapItem(unverifiedBookedItem).status).toBe('processing')
    expect(mapItem(unverifiedBookedItem, { transferStatus: 'PAID' }).status).toBe('paid')
    expect(mapRowStatus('BOOKED', 'CANCELLED', 'failed')).toBe('failed')
    expect(mapRowStatus('BOOKED', 'PAID', 'invalid')).toBe('invalid')
    expect(mapRowStatus('VALIDATED', null, 'excluded')).toBe('excluded')
    expect(mapRowStatus('BOOKED', 'SENT', null)).toBe('sent')
    expect(mapRowStatus('BOOKED', null, null)).toBe('processing')
    for (const status of ['SCHEDULED', 'PROCESSING', 'IN_APPROVAL', 'OVERDUE']) {
      expect(mapRowStatus('BOOKED', status, null)).toBe('processing')
    }
    expect(mapRowStatus('BOOKING', null, null)).toBe('booking')
    expect(mapRowStatus('BOOKING_FAILED', null, null)).toBe('booking_failed')
  })

  it('maps the unverified quote and preserves 18960.10 from raw JSON', () => {
    expect(mapQuote(unverifiedQuoteResponse.quote_summary)).toMatchObject({
      validity: 'HR_1',
      payerPays: '18960.10',
      feeAmount: '0.10',
      sourceCurrency: 'USD',
      expiresAt: '2026-04-02T19:00:02.000Z',
    })
    expect(toIsoTimestamp('2026-04-02T19:00:02+0000')).toBe('2026-04-02T19:00:02.000Z')

    const parsed = parseJsonLossless(unverifiedQuoteJson) as AirwallexQuoteResponse
    expect(parsed.quote_summary.quotes[0]?.amount_payer_pays).toBe('18960.10')
    expect(mapQuote(parsed.quote_summary).payerPays).toBe('18960.10')
    expect(
      mapQuote({
        expires_at: '2026-10-07T00:04:04+0000',
        validity: 'HR_1',
        quotes: [
          {
            amount_beneficiary_receives: '4200.0',
            amount_payer_pays: '4225',
            fee_amount: '25',
            fee_currency: 'USD',
            source_currency: 'USD',
            transfer_currency: 'USD',
          },
        ],
      }),
    ).toMatchObject({
      payerPays: '4225.00',
      feeAmount: '25.00',
      expiresAt: '2026-10-07T00:04:04.000Z',
      lines: [{ clientRate: null, currencyPair: null, amountBeneficiaryReceives: '4200.00' }],
    })
  })
})
