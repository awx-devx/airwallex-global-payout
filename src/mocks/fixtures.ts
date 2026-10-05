import { deriveRun, parseMoney, railLabel, subtractMoney, sumMoney, toRunDraft } from '@/contracts'
import type { Balance, QuoteSummary, RailQuote, RowPricing, RowStatus, RunDetail, RunDraft, RunRow } from '@/contracts'

/**
 * DEMO-ONLY: these amounts are a teaching quote for the kit and the mock.
 * PROD: totals come from the Airwallex quote on the draft batch.
 */

export const MOCK_CLOCK = '2026-04-02T18:00:00.000Z'
export const READY_EXPIRES_AT = '2026-04-02T19:00:00.000Z'
export const EXPIRED_AT = '2026-04-02T17:59:00.000Z'

const SOURCE = 'USD'
const FILE_NAME = 'contractors.csv'

export const balanceOk: Balance = {
  currency: SOURCE,
  available: '50000.00',
  pending: '0.00',
}

export const balanceShort: Balance = {
  currency: SOURCE,
  available: '100.00',
  pending: '0.00',
}

const UNPRICED: RowPricing = { chosen: null, alternatives: [], savings: null }

type PricedPerson = {
  name: string
  email: string
  country: string
  currency: string
  amount: string
  system: string | null
  pays: string
  swift?: { pays: string; fee: string }
}

const PRICED: readonly PricedPerson[] = [
  {
    name: 'Maya Chen',
    email: 'maya.chen@example.com',
    country: 'US',
    currency: 'USD',
    amount: '4200.00',
    system: 'ACH',
    pays: '4200.00',
    swift: { pays: '4215.00', fee: '15.00' },
  },
  {
    name: 'Owen Blake',
    email: 'owen.blake@example.com',
    country: 'GB',
    currency: 'GBP',
    amount: '3100.00',
    system: 'FASTER_PAYMENTS',
    pays: '3980.00',
    swift: { pays: '4002.50', fee: '22.50' },
  },
  {
    name: 'Lena Hoffmann',
    email: 'lena.hoffmann@example.com',
    country: 'DE',
    currency: 'EUR',
    amount: '2800.00',
    system: null,
    pays: '3060.00',
    swift: { pays: '3078.00', fee: '18.00' },
  },
  {
    name: 'Noah Walsh',
    email: 'noah.walsh@example.com',
    country: 'AU',
    currency: 'AUD',
    amount: '3600.00',
    system: 'BANK_TRANSFER',
    pays: '2410.00',
    swift: { pays: '2430.00', fee: '20.00' },
  },
  {
    name: 'Aisha Rahman',
    email: 'aisha.rahman@example.com',
    country: 'SG',
    currency: 'SGD',
    amount: '4100.00',
    system: 'FAST',
    pays: '3090.00',
    swift: { pays: '3112.00', fee: '22.00' },
  },
  {
    name: 'Priya Nair',
    email: 'priya.nair@example.com',
    country: 'IN',
    currency: 'INR',
    amount: '185000.00',
    system: null,
    pays: '2220.00',
  },
]

const SAM = {
  name: 'Sam Rivera',
  email: 'sam.rivera@example.com',
  country: 'US',
  currency: 'USD',
  amount: '900.00',
}

const REJECTED_PAYOUT = 'The beneficiary bank rejected the payout.'

function localQuote(person: PricedPerson): RailQuote {
  return {
    transferMethod: 'LOCAL',
    localClearingSystem: person.system,
    railLabel: railLabel('LOCAL', person.system, person.currency),
    amountPayerPays: person.pays,
    feeAmount: '0.00',
    feeCurrency: SOURCE,
    amountBeneficiaryReceives: person.amount,
    sourceCurrency: SOURCE,
    transferCurrency: person.currency,
  }
}

function swiftQuote(person: PricedPerson, swift: { pays: string; fee: string }): RailQuote {
  return {
    transferMethod: 'SWIFT',
    localClearingSystem: null,
    railLabel: railLabel('SWIFT', null, person.currency),
    amountPayerPays: swift.pays,
    feeAmount: swift.fee,
    feeCurrency: SOURCE,
    amountBeneficiaryReceives: person.amount,
    sourceCurrency: SOURCE,
    transferCurrency: person.currency,
  }
}

function pricingFor(person: PricedPerson): RowPricing {
  const chosen = localQuote(person)
  if (!person.swift) return { chosen, alternatives: [], savings: null }
  const alternative = swiftQuote(person, person.swift)
  return {
    chosen,
    alternatives: [alternative],
    savings: subtractMoney(alternative.amountPayerPays, chosen.amountPayerPays, SOURCE),
  }
}

function row(
  person: { name: string; email: string; country: string; currency: string; amount: string },
  index: number,
  status: RowStatus,
  pricing: RowPricing,
  fieldErrors: RunRow['fieldErrors'],
): RunRow {
  return {
    id: `row_${index}`,
    index,
    contractorName: person.name,
    email: person.email,
    country: person.country,
    currency: person.currency,
    amount: person.amount,
    status,
    pricing,
    fieldErrors,
    transferId: null,
    shortReference: null,
  }
}

function readyRows(): RunRow[] {
  const rows = PRICED.map((person, index) => row(person, index + 1, 'ready', pricingFor(person), []))
  rows.push(
    row(SAM, rows.length + 1, 'invalid', UNPRICED, [
      { path: 'postcode', message: 'postcode is required.' },
    ]),
  )
  return rows
}

function quoteFor(rows: readonly RunRow[], expiresAt: string): QuoteSummary {
  const lines: QuoteSummary['lines'] = []
  for (const priced of rows) {
    const chosen = priced.pricing.chosen
    if (!chosen || priced.status === 'invalid' || priced.status === 'excluded') continue
    const sameCurrency = chosen.sourceCurrency === chosen.transferCurrency
    lines.push({
      sourceCurrency: chosen.sourceCurrency,
      transferCurrency: chosen.transferCurrency,
      amountPayerPays: chosen.amountPayerPays,
      amountBeneficiaryReceives: chosen.amountBeneficiaryReceives,
      feeAmount: chosen.feeAmount,
      clientRate: sameCurrency
        ? null
        : parseMoney(chosen.amountBeneficiaryReceives).div(parseMoney(chosen.amountPayerPays)).toFixed(6),
      currencyPair: sameCurrency ? null : `${chosen.sourceCurrency}${chosen.transferCurrency}`,
    })
  }

  return {
    expiresAt,
    validity: 'HR_1',
    payerPays: sumMoney(
      lines.map((line) => line.amountPayerPays),
      SOURCE,
    ),
    feeAmount: sumMoney(
      lines.map((line) => line.feeAmount),
      SOURCE,
    ),
    sourceCurrency: SOURCE,
    lines,
  }
}

function finish(draft: RunDraft): RunDetail {
  return deriveRun(draft, MOCK_CLOCK)
}

function retarget(run: RunDetail, id: string, mutate: (draft: RunDraft) => void): RunDetail {
  const draft = structuredClone(toRunDraft(run)) as RunDraft
  draft.id = id
  mutate(draft)
  return finish(draft)
}

const readyQuote = quoteFor(readyRows(), READY_EXPIRES_AT)

export const runReady = finish({
  id: 'run_ready',
  fileName: FILE_NAME,
  createdAt: '2026-04-02T15:00:00.000Z',
  status: 'READY',
  airwallexStatus: 'DRAFTING',
  sourceCurrency: SOURCE,
  rows: readyRows(),
  quote: readyQuote,
  balance: balanceOk,
  error: null,
  shortReference: null,
  airwallexBatchId: null,
  flags: { insufficientBalance: false, demo: true },
})

export const runReadyClean = retarget(runReady, 'run_ready_clean', (draft) => {
  const sam = draft.rows.find((item) => item.contractorName === 'Sam Rivera')
  if (!sam) throw new Error('Sam Rivera is missing from the ready fixture')
  sam.status = 'excluded'
})

export const runExpired = retarget(runReadyClean, 'run_expired', (draft) => {
  if (!draft.quote) throw new Error('run_expired requires a quote')
  draft.quote.expiresAt = EXPIRED_AT
})

export const runShort = retarget(runReadyClean, 'run_short', (draft) => {
  draft.flags.insufficientBalance = true
  draft.balance = structuredClone(balanceShort)
})

export const runPricing = finish({
  id: 'run_pricing',
  fileName: FILE_NAME,
  createdAt: MOCK_CLOCK,
  status: 'PRICING',
  airwallexStatus: null,
  sourceCurrency: SOURCE,
  rows: PRICED.map((person, index) => row(person, index + 1, 'pricing', UNPRICED, [])),
  quote: null,
  balance: balanceOk,
  error: null,
  shortReference: null,
  airwallexBatchId: null,
  flags: { insufficientBalance: false, demo: true },
})

const INFLIGHT_STATUS: Record<string, RowStatus> = {
  'Maya Chen': 'processing',
  'Owen Blake': 'processing',
  'Lena Hoffmann': 'processing',
  'Noah Walsh': 'booking',
  'Aisha Rahman': 'booking',
  'Priya Nair': 'booking',
}

export const runInflight = retarget(runReadyClean, 'run_inflight', (draft) => {
  draft.createdAt = '2026-04-02T16:00:00.000Z'
  draft.status = 'SUBMITTED'
  draft.airwallexStatus = 'BOOKING'
  draft.quote = null
  draft.shortReference = 'B-run_inflight'
  draft.airwallexBatchId = 'bat_run_inflight'
  for (const item of draft.rows) {
    if (item.status === 'excluded') continue
    item.status = INFLIGHT_STATUS[item.contractorName] ?? 'booking'
    item.transferId = `tr_run_inflight_${item.id}`
  }
})

export const runApproval = retarget(runReadyClean, 'run_approval', (draft) => {
  draft.createdAt = '2026-04-02T16:30:00.000Z'
  draft.status = 'SUBMITTED'
  draft.airwallexStatus = 'IN_APPROVAL'
  draft.quote = null
  draft.shortReference = 'B-run_approval'
  draft.airwallexBatchId = 'bat_run_approval'
  for (const item of draft.rows) {
    if (item.status === 'excluded') continue
    item.status = 'booking'
    item.transferId = `tr_run_approval_${item.id}`
  }
})

export const runDone = retarget(runReadyClean, 'run_done', (draft) => {
  draft.createdAt = '2026-04-02T12:00:00.000Z'
  draft.status = 'SUBMITTED'
  draft.airwallexStatus = 'BOOKED'
  draft.quote = null
  draft.shortReference = 'B-run_done'
  draft.airwallexBatchId = 'bat_run_done'
  for (const item of draft.rows) {
    if (item.status === 'excluded') continue
    item.transferId = `tr_run_done_${item.id}`
    item.shortReference = `S${item.index}`
    if (item.contractorName === 'Priya Nair') {
      item.status = 'failed'
      item.fieldErrors = [{ path: 'row', message: REJECTED_PAYOUT }]
    } else {
      item.status = 'paid'
    }
  }
})

export const runFailed = retarget(runReadyClean, 'run_failed', (draft) => {
  draft.createdAt = '2026-04-02T14:00:00.000Z'
  draft.status = 'FAILED'
  draft.airwallexStatus = 'FAILED'
  draft.quote = null
  draft.error = { code: 'AIRWALLEX_ERROR', message: 'The batch could not be booked.' }
  draft.shortReference = 'B-run_failed'
  draft.airwallexBatchId = 'bat_run_failed'
  for (const item of draft.rows) {
    if (item.status === 'excluded') continue
    item.status = 'booking_failed'
  }
})

export const fixtureRuns = {
  run_pricing: runPricing,
  run_ready: runReady,
  run_ready_clean: runReadyClean,
  run_expired: runExpired,
  run_short: runShort,
  run_inflight: runInflight,
  run_approval: runApproval,
  run_done: runDone,
  run_failed: runFailed,
} as const

export const FIXTURE_IDS = Object.keys(fixtureRuns)

export const fixtureBalances = {
  balance_ok: balanceOk,
  balance_short: balanceShort,
} as const

export const REJECTED_PAYOUT_MESSAGE = REJECTED_PAYOUT
