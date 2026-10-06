import { RowStatusSchema, RunStatusSchema, TransferMethodSchema } from '@/contracts'
import { Schema } from 'mongoose'
import { registerModel } from '@/server/db/register-model'

const fieldErrorSchema = new Schema(
  {
    path: { type: String, required: true },
    message: { type: String, required: true },
  },
  { _id: false },
)

const railSchema = new Schema(
  {
    transferMethod: { type: String, enum: TransferMethodSchema.options, required: true },
    localClearingSystem: { type: String, default: null },
    railLabel: { type: String, required: true },
    amountPayerPays: { type: Schema.Types.Decimal128, required: true },
    feeAmount: { type: Schema.Types.Decimal128, required: true },
    feeCurrency: { type: String, required: true },
    amountBeneficiaryReceives: { type: Schema.Types.Decimal128, required: true },
    sourceCurrency: { type: String, required: true },
    transferCurrency: { type: String, required: true },
  },
  { _id: false },
)

const pricingSchema = new Schema(
  {
    chosen: { type: railSchema, default: null },
    alternatives: { type: [railSchema], required: true },
    savings: { type: Schema.Types.Decimal128, default: null },
  },
  { _id: false },
)

const rowSchema = new Schema(
  {
    id: { type: String, required: true },
    index: { type: Number, required: true },
    contractorName: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    dateOfBirth: { type: String, required: true },
    country: { type: String, required: true },
    currency: { type: String, required: true },
    amount: { type: Schema.Types.Decimal128, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, default: '' },
    postcode: { type: String, required: true },
    accountNumber: { type: String, default: '' },
    iban: { type: String, default: '' },
    routingType: { type: String, default: '' },
    routingValue: { type: String, default: '' },
    swiftBic: { type: String, default: '' },
    status: { type: String, enum: RowStatusSchema.options, required: true },
    pricing: { type: pricingSchema, required: true },
    fieldErrors: { type: [fieldErrorSchema], required: true },
    transferId: { type: String, default: null },
    shortReference: { type: String, default: null },
  },
  { _id: false },
)

const quoteLineSchema = new Schema(
  {
    sourceCurrency: { type: String, required: true },
    transferCurrency: { type: String, required: true },
    amountPayerPays: { type: Schema.Types.Decimal128, required: true },
    amountBeneficiaryReceives: { type: Schema.Types.Decimal128, required: true },
    feeAmount: { type: Schema.Types.Decimal128, required: true },
    clientRate: { type: Schema.Types.Decimal128, default: null },
    currencyPair: { type: String, default: null },
  },
  { _id: false },
)

const quoteSchema = new Schema(
  {
    expiresAt: { type: Date, required: true },
    validity: { type: String, required: true },
    payerPays: { type: Schema.Types.Decimal128, required: true },
    feeAmount: { type: Schema.Types.Decimal128, required: true },
    sourceCurrency: { type: String, required: true },
    lines: { type: [quoteLineSchema], required: true },
  },
  { _id: false },
)

const balanceSchema = new Schema(
  {
    currency: { type: String, required: true },
    available: { type: Schema.Types.Decimal128, required: true },
    pending: { type: Schema.Types.Decimal128, required: true },
  },
  { _id: false },
)

const errorSchema = new Schema(
  {
    code: { type: String, required: true },
    message: { type: String, required: true },
  },
  { _id: false },
)

const flagsSchema = new Schema(
  {
    insufficientBalance: { type: Boolean, required: true },
    demo: { type: Boolean, required: true },
  },
  { _id: false },
)

const runSchema = new Schema(
  {
    _id: { type: String, required: true },
    fileName: { type: String, required: true },
    createdAt: { type: Date, required: true },
    status: { type: String, enum: RunStatusSchema.options, required: true },
    airwallexStatus: { type: String, default: null },
    sourceCurrency: { type: String, required: true },
    rows: { type: [rowSchema], required: true },
    quote: { type: quoteSchema, default: null },
    balance: { type: balanceSchema, default: null },
    error: { type: errorSchema, default: null },
    shortReference: { type: String, default: null },
    airwallexBatchId: { type: String, default: null },
    flags: { type: flagsSchema, required: true },
  },
  { collection: 'runs', timestamps: false },
)

runSchema.index({ createdAt: -1 })

export const RunModel = registerModel('Run', runSchema)
