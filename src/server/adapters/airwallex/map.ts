import type { Balance, FieldError, QuoteSummary, RailQuote, RowStatus } from '@/contracts'
import {
  csvPathForAirwallexSource,
  parseMoney,
  railLabel,
  sumMoney,
  toMoneyString,
} from '@/contracts'
import type {
  AirwallexBalance,
  AirwallexBatch,
  AirwallexItem,
  AirwallexQuoteLine,
  AirwallexQuoteSummary,
} from '@/server/adapters/airwallex/types'
import type { MappedBatch, MappedItem } from '@/server/adapters/payments/gateway'

const OPEN_TRANSFER = new Set(['SCHEDULED', 'PROCESSING', 'IN_APPROVAL', 'OVERDUE'])

export function mapBatch(batch: AirwallexBatch): MappedBatch {
  return {
    id: batch.id,
    airwallexStatus: batch.status,
    shortReference: batch.short_reference_id,
  }
}

export function mapBalance(balances: readonly AirwallexBalance[], currency: string): Balance {
  const match = balances.find((entry) => entry.currency === currency)
  if (!match) {
    throw new Error(`No ${currency} balance in the Airwallex response`)
  }
  return {
    currency,
    available: money(match.available_amount, currency),
    pending: money(match.pending_amount, currency),
  }
}

export function mapQuote(summary: AirwallexQuoteSummary): QuoteSummary {
  const lines = summary.quotes.map(mapQuoteLine)
  const sourceCurrency = lines[0]?.sourceCurrency
  if (!sourceCurrency) throw new Error('Quote has no lines')
  if (lines.some((line) => line.sourceCurrency !== sourceCurrency)) {
    throw new Error('Quote lines use more than one source currency')
  }
  if (summary.quotes.some((line) => line.fee_currency !== sourceCurrency)) {
    throw new Error('Quote fee currency does not match the source currency')
  }
  return {
    expiresAt: toIsoTimestamp(summary.expires_at),
    validity: summary.validity,
    payerPays: sumMoney(
      lines.map((line) => line.amountPayerPays),
      sourceCurrency,
    ),
    feeAmount: sumMoney(
      lines.map((line) => line.feeAmount),
      sourceCurrency,
    ),
    sourceCurrency,
    lines,
  }
}

export function mapItem(
  item: AirwallexItem,
  options?: { current?: RowStatus | null; transferStatus?: string | null },
): MappedItem {
  const identity = itemIdentity(item)
  return {
    airwallexItemId: item.id,
    requestId: item.request_id,
    rowIndex: parseRowIndex(identity.row),
    candidate: identity.candidate,
    airwallexItemStatus: item.status,
    status: mapRowStatus(item.status, options?.transferStatus ?? null, options?.current),
    fieldErrors: (item.errors ?? []).map(mapItemError),
    transferId: transferId(item),
    shortReference: item.transfer_draft?.short_reference_id ?? null,
    rail: mapRail(item),
  }
}

export function mapRowStatus(
  itemStatus: string,
  transferStatus: string | null,
  current?: RowStatus | null,
): RowStatus {
  if (current === 'invalid' || current === 'excluded') return current
  const next = rowStatusFromAirwallex(itemStatus, transferStatus)
  if (current === 'failed' && next === 'cancelled') return 'failed'
  return next
}

function rowStatusFromAirwallex(itemStatus: string, transferStatus: string | null): RowStatus {
  if (itemStatus === 'VALIDATION_FAILED') return 'needs_fix'
  if (itemStatus === 'VALIDATED') return 'ready'
  if (itemStatus === 'BOOKING') return 'booking'
  if (itemStatus === 'BOOKING_FAILED') return 'booking_failed'
  if (itemStatus === 'BOOKED') {
    if (transferStatus == null || OPEN_TRANSFER.has(transferStatus)) return 'processing'
    if (transferStatus === 'SENT') return 'sent'
    if (transferStatus === 'PAID') return 'paid'
    if (transferStatus === 'FAILED') return 'failed'
    if (transferStatus === 'CANCELLED') return 'cancelled'
    throw new Error(`Unmapped transfer status ${transferStatus}`)
  }
  throw new Error(`Unmapped item status ${itemStatus}`)
}

function transferId(item: AirwallexItem): string | null {
  // After BOOKED the list item carries transfer_id. transfer_draft is absent.
  if (typeof item.transfer_id === 'string' && item.transfer_id !== '') return item.transfer_id
  if (item.status === 'BOOKED' && typeof item.transfer_draft?.id === 'string')
    return item.transfer_draft.id
  return null
}

function mapRail(item: AirwallexItem): RailQuote | null {
  const draft = item.transfer_draft
  if (!draft?.transfer_method || !draft.source_currency || !draft.transfer_currency) return null
  if (draft.transfer_method !== 'LOCAL' && draft.transfer_method !== 'SWIFT') return null
  const system = draft.beneficiary?.bank_details?.local_clearing_system ?? null
  return {
    transferMethod: draft.transfer_method,
    localClearingSystem: system === '' ? null : system,
    railLabel: railLabel(
      draft.transfer_method,
      system === '' ? null : system,
      draft.transfer_currency,
    ),
    amountPayerPays: money(draft.amount_payer_pays, draft.source_currency),
    feeAmount: money(draft.fee_amount, draft.fee_currency ?? draft.source_currency),
    feeCurrency: draft.fee_currency ?? draft.source_currency,
    amountBeneficiaryReceives: money(draft.amount_beneficiary_receives, draft.transfer_currency),
    sourceCurrency: draft.source_currency,
    transferCurrency: draft.transfer_currency,
  }
}

function mapQuoteLine(line: AirwallexQuoteLine): QuoteSummary['lines'][number] {
  return {
    sourceCurrency: line.source_currency,
    transferCurrency: line.transfer_currency,
    amountPayerPays: money(line.amount_payer_pays, line.source_currency),
    amountBeneficiaryReceives: money(line.amount_beneficiary_receives, line.transfer_currency),
    feeAmount: money(line.fee_amount, line.fee_currency),
    clientRate: line.client_rate == null || line.client_rate === '' ? null : rate(line.client_rate),
    currencyPair: line.currency_pair ?? null,
  }
}

function mapItemError(error: { source?: string; message?: string; code?: string }): FieldError {
  const source = error.source ?? ''
  return {
    path: source === '' ? 'row' : csvPathForAirwallexSource(source),
    message: error.message ?? error.code ?? 'Airwallex rejected this field.',
  }
}

function itemIdentity(item: AirwallexItem): { row: string | null; candidate: 'L' | 'S' | null } {
  const metaSource = item.metadata ?? item.transfer_draft?.metadata
  const meta = metaSource?.candidate
  if (meta === 'L' || meta === 'S') {
    return { row: metaSource?.row ?? null, candidate: meta }
  }
  const match = /^i:.+:(\d+):([LS])$/.exec(item.request_id)
  const row = match?.[1]
  const candidate = match?.[2]
  if (row == null || (candidate !== 'L' && candidate !== 'S')) return { row: null, candidate: null }
  return { row, candidate }
}

function parseRowIndex(value: string | null | undefined): number | null {
  if (value == null || value === '') return null
  const index = Number(value)
  if (!Number.isInteger(index) || index < 1) return null
  return index
}

function money(value: string | undefined, currency: string): string {
  if (value == null || value === '') throw new Error('Missing money amount')
  return toMoneyString(parseMoney(value), currency)
}

function rate(value: string): string {
  parseMoney(value)
  return value
}

export function toIsoTimestamp(value: string): string {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) throw new Error(`Invalid Airwallex timestamp ${value}`)
  return new Date(parsed).toISOString()
}
