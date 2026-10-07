import type {
  Balance,
  FieldError,
  QuoteLine,
  QuoteSummary,
  RailQuote,
  RowPricing,
  RunError,
  RunRow,
  RunStatus,
} from '@/contracts'
import { connectDb } from '@/server/db/connect'
import {
  fromDecimal128,
  fromDecimal128OrNull,
  toDecimal128,
  toDecimal128OrNull,
} from '@/server/db/money'
import { RunModel } from '@/server/db/run-model'

export type StoredRow = RunRow & {
  firstName: string
  lastName: string
  dateOfBirth: string
  street: string
  city: string
  state: string
  postcode: string
  accountNumber: string
  iban: string
  routingType: string
  routingValue: string
  swiftBic: string
}

export type StoredRun = {
  id: string
  fileName: string
  createdAt: string
  status: RunStatus
  airwallexStatus: string | null
  sourceCurrency: string
  rows: StoredRow[]
  quote: QuoteSummary | null
  balance: Balance | null
  error: RunError | null
  shortReference: string | null
  airwallexBatchId: string | null
  flags: {
    insufficientBalance: boolean
    demo: boolean
  }
}

export async function saveRun(run: StoredRun): Promise<void> {
  await connectDb()
  await RunModel.replaceOne({ _id: run.id }, toDocument(run), { upsert: true })
}

export async function listRuns(): Promise<StoredRun[]> {
  await connectDb()
  const docs = await RunModel.find().sort({ createdAt: -1 }).lean()
  return docs.map((doc) => fromDocument(doc))
}

export async function findRunById(id: string): Promise<StoredRun | null> {
  await connectDb()
  const doc = await RunModel.findById(id).lean()
  if (!doc) return null
  return fromDocument(doc)
}

export async function findRunByBatchId(batchId: string): Promise<StoredRun | null> {
  await connectDb()
  const doc = await RunModel.findOne({ airwallexBatchId: batchId }).lean()
  if (!doc) return null
  return fromDocument(doc)
}

export async function findRunByTransferId(transferId: string): Promise<StoredRun | null> {
  await connectDb()
  const doc = await RunModel.findOne({ 'rows.transferId': transferId }).lean()
  if (!doc) return null
  return fromDocument(doc)
}

function toDocument(run: StoredRun) {
  return {
    _id: run.id,
    fileName: run.fileName,
    createdAt: new Date(run.createdAt),
    status: run.status,
    airwallexStatus: run.airwallexStatus,
    sourceCurrency: run.sourceCurrency,
    rows: run.rows.map(rowToDocument),
    quote: run.quote ? quoteToDocument(run.quote) : null,
    balance: run.balance ? balanceToDocument(run.balance) : null,
    error: run.error,
    shortReference: run.shortReference,
    airwallexBatchId: run.airwallexBatchId,
    flags: run.flags,
  }
}

function rowToDocument(row: StoredRow) {
  return {
    ...row,
    amount: toDecimal128(row.amount),
    pricing: {
      chosen: row.pricing.chosen ? railToDocument(row.pricing.chosen) : null,
      alternatives: row.pricing.alternatives.map(railToDocument),
      savings: toDecimal128OrNull(row.pricing.savings),
    },
  }
}

function railToDocument(rail: RailQuote) {
  return {
    transferMethod: rail.transferMethod,
    localClearingSystem: rail.localClearingSystem,
    railLabel: rail.railLabel,
    amountPayerPays: toDecimal128(rail.amountPayerPays),
    feeAmount: toDecimal128(rail.feeAmount),
    feeCurrency: rail.feeCurrency,
    amountBeneficiaryReceives: toDecimal128(rail.amountBeneficiaryReceives),
    sourceCurrency: rail.sourceCurrency,
    transferCurrency: rail.transferCurrency,
  }
}

function quoteToDocument(quote: QuoteSummary) {
  return {
    expiresAt: new Date(quote.expiresAt),
    validity: quote.validity,
    payerPays: toDecimal128(quote.payerPays),
    feeAmount: toDecimal128(quote.feeAmount),
    sourceCurrency: quote.sourceCurrency,
    lines: quote.lines.map((line) => ({
      sourceCurrency: line.sourceCurrency,
      transferCurrency: line.transferCurrency,
      amountPayerPays: toDecimal128(line.amountPayerPays),
      amountBeneficiaryReceives: toDecimal128(line.amountBeneficiaryReceives),
      feeAmount: toDecimal128(line.feeAmount),
      clientRate: toDecimal128OrNull(line.clientRate),
      currencyPair: line.currencyPair,
    })),
  }
}

function balanceToDocument(balance: Balance) {
  return {
    currency: balance.currency,
    available: toDecimal128(balance.available),
    pending: toDecimal128(balance.pending),
  }
}

function fromDocument(value: unknown): StoredRun {
  const doc = readRecord(value, 'run')
  return {
    id: readString(doc._id, '_id'),
    fileName: readString(doc.fileName, 'fileName'),
    createdAt: readDateIso(doc.createdAt, 'createdAt'),
    status: readString(doc.status, 'status') as RunStatus,
    airwallexStatus: readNullableString(doc.airwallexStatus),
    sourceCurrency: readString(doc.sourceCurrency, 'sourceCurrency'),
    rows: readArray(doc.rows, 'rows').map(rowFromDocument),
    quote: doc.quote == null ? null : quoteFromDocument(doc.quote),
    balance: doc.balance == null ? null : balanceFromDocument(doc.balance),
    error: doc.error == null ? null : errorFromDocument(doc.error),
    shortReference: readNullableString(doc.shortReference),
    airwallexBatchId: readNullableString(doc.airwallexBatchId),
    flags: flagsFromDocument(doc.flags),
  }
}

function rowFromDocument(value: unknown): StoredRow {
  const row = readRecord(value, 'row')
  return {
    id: readString(row.id, 'row.id'),
    index: readNumber(row.index, 'row.index'),
    contractorName: readString(row.contractorName, 'row.contractorName'),
    firstName: readString(row.firstName, 'row.firstName'),
    lastName: readString(row.lastName, 'row.lastName'),
    email: readString(row.email, 'row.email'),
    dateOfBirth: readString(row.dateOfBirth, 'row.dateOfBirth'),
    country: readString(row.country, 'row.country'),
    currency: readString(row.currency, 'row.currency'),
    amount: fromDecimal128(row.amount),
    street: readString(row.street, 'row.street'),
    city: readString(row.city, 'row.city'),
    state: readString(row.state, 'row.state'),
    postcode: readString(row.postcode, 'row.postcode'),
    accountNumber: readString(row.accountNumber, 'row.accountNumber'),
    iban: readString(row.iban, 'row.iban'),
    routingType: readString(row.routingType, 'row.routingType'),
    routingValue: readString(row.routingValue, 'row.routingValue'),
    swiftBic: readString(row.swiftBic, 'row.swiftBic'),
    status: readString(row.status, 'row.status') as RunRow['status'],
    pricing: pricingFromDocument(row.pricing),
    fieldErrors: readArray(row.fieldErrors, 'row.fieldErrors').map(fieldErrorFromDocument),
    transferId: readNullableString(row.transferId),
    shortReference: readNullableString(row.shortReference),
  }
}

function pricingFromDocument(value: unknown): RowPricing {
  const pricing = readRecord(value, 'pricing')
  return {
    chosen: pricing.chosen == null ? null : railFromDocument(pricing.chosen),
    alternatives: readArray(pricing.alternatives, 'pricing.alternatives').map(railFromDocument),
    savings: fromDecimal128OrNull(pricing.savings),
  }
}

function railFromDocument(value: unknown): RailQuote {
  const rail = readRecord(value, 'rail')
  return {
    transferMethod: readString(
      rail.transferMethod,
      'rail.transferMethod',
    ) as RailQuote['transferMethod'],
    localClearingSystem: readNullableString(rail.localClearingSystem),
    railLabel: readString(rail.railLabel, 'rail.railLabel'),
    amountPayerPays: fromDecimal128(rail.amountPayerPays),
    feeAmount: fromDecimal128(rail.feeAmount),
    feeCurrency: readString(rail.feeCurrency, 'rail.feeCurrency'),
    amountBeneficiaryReceives: fromDecimal128(rail.amountBeneficiaryReceives),
    sourceCurrency: readString(rail.sourceCurrency, 'rail.sourceCurrency'),
    transferCurrency: readString(rail.transferCurrency, 'rail.transferCurrency'),
  }
}

function quoteFromDocument(value: unknown): QuoteSummary {
  const quote = readRecord(value, 'quote')
  return {
    expiresAt: readDateIso(quote.expiresAt, 'quote.expiresAt'),
    validity: readString(quote.validity, 'quote.validity'),
    payerPays: fromDecimal128(quote.payerPays),
    feeAmount: fromDecimal128(quote.feeAmount),
    sourceCurrency: readString(quote.sourceCurrency, 'quote.sourceCurrency'),
    lines: readArray(quote.lines, 'quote.lines').map(lineFromDocument),
  }
}

function lineFromDocument(value: unknown): QuoteLine {
  const line = readRecord(value, 'quote.line')
  return {
    sourceCurrency: readString(line.sourceCurrency, 'line.sourceCurrency'),
    transferCurrency: readString(line.transferCurrency, 'line.transferCurrency'),
    amountPayerPays: fromDecimal128(line.amountPayerPays),
    amountBeneficiaryReceives: fromDecimal128(line.amountBeneficiaryReceives),
    feeAmount: fromDecimal128(line.feeAmount),
    clientRate: fromDecimal128OrNull(line.clientRate),
    currencyPair: readNullableString(line.currencyPair),
  }
}

function balanceFromDocument(value: unknown): Balance {
  const balance = readRecord(value, 'balance')
  return {
    currency: readString(balance.currency, 'balance.currency'),
    available: fromDecimal128(balance.available),
    pending: fromDecimal128(balance.pending),
  }
}

function errorFromDocument(value: unknown): RunError {
  const error = readRecord(value, 'error')
  return {
    code: readString(error.code, 'error.code'),
    message: readString(error.message, 'error.message'),
  }
}

function flagsFromDocument(value: unknown): StoredRun['flags'] {
  const flags = readRecord(value, 'flags')
  return {
    insufficientBalance: readBoolean(flags.insufficientBalance, 'flags.insufficientBalance'),
    demo: readBoolean(flags.demo, 'flags.demo'),
  }
}

function fieldErrorFromDocument(value: unknown): FieldError {
  const error = readRecord(value, 'fieldError')
  return {
    path: readString(error.path, 'fieldError.path'),
    message: readString(error.message, 'fieldError.message'),
  }
}

function readRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Expected object for ${field}`)
  }
  return value as Record<string, unknown>
}

function readArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Expected array for ${field}`)
  return value
}

function readString(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new Error(`Expected string for ${field}`)
  return value
}

function readNullableString(value: unknown): string | null {
  if (value == null) return null
  if (typeof value !== 'string') throw new Error('Expected string or null')
  return value
}

function readNumber(value: unknown, field: string): number {
  if (typeof value !== 'number') throw new Error(`Expected number for ${field}`)
  return value
}

function readBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`Expected boolean for ${field}`)
  return value
}

function readDateIso(value: unknown, field: string): string {
  if (value instanceof Date) return value.toISOString()
  throw new Error(`Expected date for ${field}`)
}
