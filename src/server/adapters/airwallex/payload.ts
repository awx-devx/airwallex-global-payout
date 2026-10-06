import type { BatchItemDraft } from '@/server/adapters/payments/gateway'

export type BatchCreatePayload = {
  request_id: string
  name: string
  metadata: { run_id: string }
}

// AIRWALLEX: setting transfer_date, even to today, routes the batch through scheduled-transfer logic.
// https://www.airwallex.com/docs/payouts/batch-transfers/create-a-batch-transfer.md
export function batchCreatePayload(input: {
  requestId: string
  name: string
  runId: string
}): BatchCreatePayload {
  return {
    request_id: input.requestId,
    name: input.name,
    metadata: { run_id: input.runId },
  }
}

export function addItemsPayload(items: readonly BatchItemDraft[]): {
  items: AirwallexCreateItem[]
} {
  return { items: items.map(toCreateItem) }
}

type AirwallexCreateItem = {
  request_id: string
  transfer_method: 'LOCAL' | 'SWIFT'
  source_currency: string
  transfer_currency: string
  transfer_amount: string
  reason: 'wages_salary'
  reference: string
  fee_paid_by: 'PAYER'
  swift_charge_option?: 'PAYER'
  metadata: { row: string; candidate: 'L' | 'S' }
  beneficiary: {
    entity_type: 'PERSONAL'
    first_name: string
    last_name: string
    date_of_birth: string
    additional_info: { personal_email: string }
    address: {
      street_address: string
      city: string
      state?: string
      postcode: string
      country_code: string
    }
    bank_details: {
      account_name: string
      account_currency: string
      bank_country_code: string
      account_number?: string
      iban?: string
      account_routing_type1?: string
      account_routing_value1?: string
      swift_code?: string
      bank_account_category?: 'Checking'
    }
  }
}

function toCreateItem(item: BatchItemDraft): AirwallexCreateItem {
  const address: AirwallexCreateItem['beneficiary']['address'] = {
    street_address: item.beneficiary.address.street,
    city: item.beneficiary.address.city,
    postcode: item.beneficiary.address.postcode,
    country_code: item.beneficiary.address.countryCode,
  }
  const state = subdivisionState(
    item.beneficiary.address.countryCode,
    item.beneficiary.address.state,
  )
  if (state) address.state = state

  const bank: AirwallexCreateItem['beneficiary']['bank_details'] = {
    account_name: item.beneficiary.accountName,
    account_currency: item.beneficiary.accountCurrency,
    bank_country_code: item.beneficiary.bankCountryCode,
  }
  assignIfPresent(bank, 'account_number', item.beneficiary.accountNumber)
  // GB local schema has no iban. Sending one fails validation. DE local is iban-only.
  if (!(item.transferMethod === 'LOCAL' && item.beneficiary.accountNumber)) {
    assignIfPresent(bank, 'iban', item.beneficiary.iban)
  }
  assignIfPresent(bank, 'account_routing_type1', item.beneficiary.routingType)
  assignIfPresent(bank, 'account_routing_value1', item.beneficiary.routingValue)
  assignIfPresent(bank, 'swift_code', item.beneficiary.swiftBic)
  if (item.beneficiary.bankCountryCode === 'US') bank.bank_account_category = 'Checking'

  const payload: AirwallexCreateItem = {
    request_id: item.requestId,
    transfer_method: item.transferMethod,
    source_currency: item.sourceCurrency,
    transfer_currency: item.transferCurrency,
    transfer_amount: item.transferAmount,
    reason: 'wages_salary',
    reference: item.reference,
    fee_paid_by: 'PAYER',
    metadata: item.metadata,
    beneficiary: {
      entity_type: 'PERSONAL',
      first_name: item.beneficiary.firstName,
      last_name: item.beneficiary.lastName,
      date_of_birth: item.beneficiary.dateOfBirth,
      additional_info: { personal_email: item.beneficiary.email },
      address,
      bank_details: bank,
    },
  }
  if (item.transferMethod === 'SWIFT') payload.swift_charge_option = 'PAYER'
  return payload
}

function assignIfPresent(target: Record<string, string>, key: string, value: string | undefined) {
  if (value != null && value !== '') target[key] = value
}

// US and AU schemas require ISO 3166-2 codes (US-WA, AU-VIC). IN accepted KA as sent.
function subdivisionState(country: string, state: string): string | undefined {
  if (state === '') return undefined
  if ((country === 'US' || country === 'AU') && !state.startsWith(`${country}-`)) {
    return `${country}-${state}`
  }
  return state
}
