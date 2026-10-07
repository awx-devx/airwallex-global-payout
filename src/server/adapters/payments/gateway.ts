import type { Balance, FieldError, QuoteSummary, RailQuote, RowStatus } from '@/contracts'

export type BatchItemDraft = {
  requestId: string
  transferMethod: 'LOCAL' | 'SWIFT'
  sourceCurrency: string
  transferCurrency: string
  transferAmount: string
  reference: string
  metadata: { row: string; candidate: 'L' | 'S' }
  beneficiary: {
    firstName: string
    lastName: string
    email: string
    dateOfBirth: string
    address: {
      street: string
      city: string
      state: string
      postcode: string
      countryCode: string
    }
    accountName: string
    accountCurrency: string
    bankCountryCode: string
    accountNumber?: string
    iban?: string
    routingType?: string
    routingValue?: string
    swiftBic?: string
  }
}

export type MappedBatch = {
  id: string
  airwallexStatus: string
  shortReference: string | null
}

export type MappedItem = {
  airwallexItemId: string
  requestId: string
  rowIndex: number | null
  candidate: 'L' | 'S' | null
  /** Airwallex item status before the row map, so a later transfer read can remap it. */
  airwallexItemStatus: string
  status: RowStatus
  fieldErrors: FieldError[]
  transferId: string | null
  shortReference: string | null
  rail: RailQuote | null
}

export type SimulationStatus = 'PROCESSING' | 'SENT' | 'PAID' | 'FAILED'

export type QuoteValidity = 'HR_1' | 'MIN_15'

export type CallContext = { runId?: string }

export type PaymentsGateway = {
  currentBalance(currency: string, context?: CallContext): Promise<Balance>
  createBatch(
    input: { requestId: string; name: string; runId: string },
    context?: CallContext,
  ): Promise<MappedBatch>
  /** Existing batch for this request id, or null. Used after `batch_request_id_duplicate`. */
  findBatchByRequestId(requestId: string, context?: CallContext): Promise<MappedBatch | null>
  addItems(batchId: string, items: readonly BatchItemDraft[], context?: CallContext): Promise<void>
  listItems(batchId: string, context?: CallContext): Promise<MappedItem[]>
  deleteItems(batchId: string, itemIds: readonly string[], context?: CallContext): Promise<void>
  quoteBatch(batchId: string, validity: QuoteValidity, context?: CallContext): Promise<QuoteSummary>
  submitBatch(batchId: string, context?: CallContext): Promise<MappedBatch>
  getBatch(batchId: string, context?: CallContext): Promise<MappedBatch>
  deleteBatch(batchId: string, context?: CallContext): Promise<void>
  getTransfer(transferId: string, context?: CallContext): Promise<{ id: string; status: string }>
  transitionTransfer(
    transferId: string,
    nextStatus: SimulationStatus,
    context?: CallContext,
  ): Promise<void>
}
