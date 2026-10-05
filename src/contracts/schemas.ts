import { z } from 'zod'

export const MoneyStringSchema = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/)

export const TimestampSchema = z.string().datetime()

export const RunStatusSchema = z.enum(['PRICING', 'READY', 'SUBMITTED', 'FAILED', 'DISCARDED'])
export type RunStatus = z.infer<typeof RunStatusSchema>

export const RowStatusSchema = z.enum([
  'invalid',
  'pricing',
  'ready',
  'needs_fix',
  'excluded',
  'booking',
  'booked',
  'booking_failed',
  'processing',
  'sent',
  'paid',
  'failed',
  'cancelled',
])
export type RowStatus = z.infer<typeof RowStatusSchema>

export const TransferMethodSchema = z.enum(['LOCAL', 'SWIFT'])
export type TransferMethod = z.infer<typeof TransferMethodSchema>

export const RunActionSchema = z.enum(['pay', 'discard', 'exclude', 'requote', 'advance'])
export type RunAction = z.infer<typeof RunActionSchema>

export const FieldErrorSchema = z.object({
  path: z.string(),
  message: z.string(),
})
export type FieldError = z.infer<typeof FieldErrorSchema>

export const RailSchema = z.object({
  transferMethod: TransferMethodSchema,
  localClearingSystem: z.string().nullable(),
  railLabel: z.string(),
})
export type Rail = z.infer<typeof RailSchema>

export const RailQuoteSchema = RailSchema.extend({
  amountPayerPays: MoneyStringSchema,
  feeAmount: MoneyStringSchema,
  feeCurrency: z.string(),
  amountBeneficiaryReceives: MoneyStringSchema,
  sourceCurrency: z.string(),
  transferCurrency: z.string(),
})
export type RailQuote = z.infer<typeof RailQuoteSchema>

export const RowPricingSchema = z.object({
  chosen: RailQuoteSchema.nullable(),
  alternatives: z.array(RailQuoteSchema),
  savings: MoneyStringSchema.nullable(),
})
export type RowPricing = z.infer<typeof RowPricingSchema>

export const RunSummarySchema = z.object({
  id: z.string().min(1),
  fileName: z.string(),
  createdAt: TimestampSchema,
  status: RunStatusSchema,
  airwallexStatus: z.string().nullable(),
  sourceCurrency: z.string(),
  rowCount: z.number().int().nonnegative(),
  includedCount: z.number().int().nonnegative(),
  needsAttentionCount: z.number().int().nonnegative(),
  totalPayerPays: MoneyStringSchema.nullable(),
  totalSavings: MoneyStringSchema.nullable(),
  settled: z.boolean(),
  quoteExpired: z.boolean(),
})
export type RunSummary = z.infer<typeof RunSummarySchema>

export const RunRowSchema = z.object({
  id: z.string().min(1),
  index: z.number().int().positive(),
  contractorName: z.string(),
  email: z.string(),
  country: z.string(),
  currency: z.string(),
  amount: MoneyStringSchema,
  status: RowStatusSchema,
  pricing: RowPricingSchema,
  fieldErrors: z.array(FieldErrorSchema),
  transferId: z.string().nullable(),
  shortReference: z.string().nullable(),
})
export type RunRow = z.infer<typeof RunRowSchema>

export const QuoteLineSchema = z.object({
  sourceCurrency: z.string(),
  transferCurrency: z.string(),
  amountPayerPays: MoneyStringSchema,
  amountBeneficiaryReceives: MoneyStringSchema,
  feeAmount: MoneyStringSchema,
  clientRate: MoneyStringSchema.nullable(),
  currencyPair: z.string().nullable(),
})
export type QuoteLine = z.infer<typeof QuoteLineSchema>

export const QuoteSummarySchema = z.object({
  expiresAt: TimestampSchema,
  validity: z.string(),
  payerPays: MoneyStringSchema,
  feeAmount: MoneyStringSchema,
  sourceCurrency: z.string(),
  lines: z.array(QuoteLineSchema),
})
export type QuoteSummary = z.infer<typeof QuoteSummarySchema>

export const BalanceSchema = z.object({
  currency: z.string(),
  available: MoneyStringSchema,
  pending: MoneyStringSchema,
})
export type Balance = z.infer<typeof BalanceSchema>

export const RunErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
})
export type RunError = z.infer<typeof RunErrorSchema>

export const RunFlagsSchema = z.object({
  insufficientBalance: z.boolean(),
  quoteExpired: z.boolean(),
  needsAttention: z.boolean(),
  approvalHold: z.boolean(),
  demo: z.boolean(),
})
export type RunFlags = z.infer<typeof RunFlagsSchema>

export type RunDraftFlags = {
  insufficientBalance: boolean
  demo: boolean
}

export const RunDetailSchema = RunSummarySchema.extend({
  rows: z.array(RunRowSchema),
  quote: QuoteSummarySchema.nullable(),
  poll: z.boolean(),
  flags: RunFlagsSchema,
  allowedActions: z.array(RunActionSchema),
  balance: BalanceSchema.nullable(),
  error: RunErrorSchema.nullable(),
  shortReference: z.string().nullable(),
  airwallexBatchId: z.string().nullable(),
})
export type RunDetail = z.infer<typeof RunDetailSchema>

export const ErrorEnvelopeSchema = z.object({
  error: RunErrorSchema.extend({
    fieldErrors: z.array(FieldErrorSchema).optional(),
  }),
})
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>

export const ProgressStepIdSchema = z.enum(['upload', 'price', 'review', 'pay', 'done'])
export type ProgressStepId = z.infer<typeof ProgressStepIdSchema>

export const StepStateSchema = z.enum(['complete', 'current', 'upcoming', 'failed'])
export type StepState = z.infer<typeof StepStateSchema>

export const ProgressStepSchema = z.object({
  id: ProgressStepIdSchema,
  label: z.enum(['Upload', 'Price', 'Review', 'Pay', 'Done']),
  state: StepStateSchema,
  detail: z.string().nullable(),
})
export type ProgressStep = z.infer<typeof ProgressStepSchema>

export const RunProgressSchema = z.object({
  steps: z.tuple([
    ProgressStepSchema,
    ProgressStepSchema,
    ProgressStepSchema,
    ProgressStepSchema,
    ProgressStepSchema,
  ]),
  currentId: ProgressStepIdSchema,
})
export type RunProgress = z.infer<typeof RunProgressSchema>

export type DataSource = {
  listRuns(): Promise<RunSummary[]>
  getRun(id: string): Promise<RunDetail>
  createRun(file: File): Promise<RunDetail>
  pay(id: string): Promise<RunDetail>
  requote(id: string): Promise<RunDetail>
  discard(id: string): Promise<RunDetail>
  excludeRow(id: string, rowId: string): Promise<RunDetail>
  getBalance(): Promise<Balance>
  advance(id: string): Promise<RunDetail>
  reset(): Promise<void>
}
