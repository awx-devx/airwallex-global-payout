/**
 * UNVERIFIED: fields named in docs/04. B2 replaces the fixtures with sandbox recordings.
 * Amounts are strings because the client parses JSON numbers without using JS numbers.
 */

export type AirwallexBatch = {
  id: string
  status: string
  short_reference_id: string | null
  quote_summary?: AirwallexQuoteSummary
}

export type AirwallexQuoteSummary = {
  expires_at: string
  validity: string
  quotes: AirwallexQuoteLine[]
}

export type AirwallexQuoteLine = {
  source_currency: string
  transfer_currency: string
  amount_payer_pays: string
  amount_beneficiary_receives: string
  fee_amount: string
  fee_currency: string
  client_rate?: string | null
  currency_pair?: string | null
}

export type AirwallexItemError = {
  code?: string
  source?: string
  message?: string
}

export type AirwallexItem = {
  id: string
  request_id: string
  status: string
  transfer_id?: string | null
  metadata?: { row?: string; candidate?: string }
  errors?: AirwallexItemError[]
  transfer_draft?: {
    id?: string
    amount_payer_pays?: string
    amount_beneficiary_receives?: string
    fee_amount?: string
    fee_currency?: string
    source_currency?: string
    transfer_currency?: string
    transfer_method?: string
    short_reference_id?: string | null
    beneficiary?: {
      bank_details?: {
        local_clearing_system?: string | null
      }
    }
    metadata?: { row?: string; candidate?: string }
  } | null
}

export type AirwallexBalance = {
  currency: string
  available_amount: string
  pending_amount: string
}

export type AirwallexTransfer = {
  id: string
  status: string
}

export type AirwallexQuoteResponse = {
  quote_summary: AirwallexQuoteSummary
}

export const unverifiedBatch = {
  id: 'bat_unverified',
  status: 'DRAFTING',
  short_reference_id: 'B-unverified',
} satisfies AirwallexBatch

export const unverifiedItem = {
  id: 'itm_unverified',
  request_id: 'i:run:1:L',
  status: 'VALIDATION_FAILED',
  metadata: { row: '1', candidate: 'L' },
  errors: [
    {
      code: 'validation_failed',
      source: 'beneficiary.bank_details.account_number',
      message: 'Account number is invalid.',
    },
  ],
  transfer_draft: null,
} satisfies AirwallexItem

export const unverifiedValidatedItem = {
  id: 'itm_validated',
  request_id: 'i:run:1:S',
  status: 'VALIDATED',
  metadata: { row: '1', candidate: 'S' },
  transfer_draft: {
    amount_payer_pays: '4215.00',
    amount_beneficiary_receives: '4200.00',
    fee_amount: '15.00',
    fee_currency: 'USD',
    source_currency: 'USD',
    transfer_currency: 'USD',
    transfer_method: 'SWIFT',
    short_reference_id: 'S1',
    beneficiary: { bank_details: { local_clearing_system: null } },
  },
} satisfies AirwallexItem

export const unverifiedBookedItem = {
  id: 'itm_booked',
  request_id: 'i:run:2:L',
  status: 'BOOKED',
  transfer_id: 'tr_booked',
  metadata: { row: '2', candidate: 'L' },
  transfer_draft: {
    id: 'draft_should_not_win',
    amount_payer_pays: '3980.00',
    amount_beneficiary_receives: '3100.00',
    fee_amount: '0.00',
    fee_currency: 'USD',
    source_currency: 'USD',
    transfer_currency: 'GBP',
    transfer_method: 'LOCAL',
    short_reference_id: 'S2',
    beneficiary: { bank_details: { local_clearing_system: 'FASTER_PAYMENTS' } },
  },
} satisfies AirwallexItem

export const unverifiedQuoteResponse = {
  quote_summary: {
    expires_at: '2026-04-02T19:00:02+0000',
    validity: 'HR_1',
    quotes: [
      {
        source_currency: 'USD',
        transfer_currency: 'USD',
        amount_payer_pays: '18960.10',
        amount_beneficiary_receives: '18960.10',
        fee_amount: '0.10',
        fee_currency: 'USD',
        client_rate: null,
        currency_pair: null,
      },
    ],
  },
} satisfies AirwallexQuoteResponse

/** Raw body. The trailing zero must survive parsing. */
export const unverifiedQuoteJson =
  '{"quote_summary":{"expires_at":"2026-04-02T19:00:02+0000","validity":"HR_1","quotes":[{"source_currency":"USD","transfer_currency":"USD","amount_payer_pays":18960.10,"amount_beneficiary_receives":18960.10,"fee_amount":0.10,"fee_currency":"USD","client_rate":null,"currency_pair":null}]}}'
