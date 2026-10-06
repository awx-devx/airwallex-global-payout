import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { parseContractorCsv, type ParsedRow } from '@/contracts'
import type { AirwallexFetch } from '@/server/adapters/airwallex/client'
import { createAirwallexClientFromEnv } from '@/server/adapters/airwallex/client'
import { AirwallexError } from '@/server/adapters/airwallex/errors'
import { parseJsonLossless } from '@/server/adapters/airwallex/json'
import { addItemsPayload, batchCreatePayload } from '@/server/adapters/airwallex/payload'
import type { AirwallexItem } from '@/server/adapters/airwallex/types'
import type { BatchItemDraft, QuoteValidity } from '@/server/adapters/payments/gateway'
import { loadEnvFile } from '@/server/env-file'
import { getServerEnv } from '@/server/env'

// SANDBOX: creates draft batches and submits one 10.00 USD transfer on the API-key account.
// PROD: do not run. The script refuses a non-sandbox base URL.

loadEnvFile(path.resolve('.env'))

const FIXTURES = path.resolve('src/server/adapters/airwallex/__fixtures__')
const RESULTS = path.resolve('docs/verification-results.md')
const SUBMIT_AMOUNT = '10.00'
const ADDRESS_FIELDS = [
  'beneficiary.date_of_birth',
  'beneficiary.address.street_address',
  'beneficiary.address.city',
  'beneficiary.address.state',
  'beneficiary.address.postcode',
  'beneficiary.address.country_code',
] as const

type CheckResult = 'pass' | 'fail' | 'skip'
type Check = { id: string; blocking: boolean; result: CheckResult; detail: string }
type Capture = { method: string; path: string; status: number; body: unknown }

const captures: Capture[] = []
const fixtures = new Map<string, unknown>()
const draftIds: string[] = []
let secrets: string[] = []

describe('airwallex sandbox checklist', () => {
  it('runs V1 through V12 and writes redacted fixtures', async () => {
    const report = await runChecklist()
    const blocking = report.filter((check) => check.blocking && check.result !== 'pass')
    expect(blocking, blocking.map((check) => `${check.id}: ${check.detail}`).join('\n')).toEqual([])
  }, 300_000)
})

async function runChecklist(): Promise<Check[]> {
  const checks: Check[] = []
  const env = getServerEnv()
  if (env.AIRWALLEX_ENV !== 'sandbox' || !env.AIRWALLEX_BASE_URL.includes('sandbox')) {
    throw new Error('Refusing to run the smoke script outside the sandbox')
  }

  const sample = readFileSync(path.resolve('docs/samples/contractors.csv'), 'utf8')
  const parsed = parseContractorCsv({ text: sample, fileName: 'contractors.csv' })
  if (!parsed.ok) throw new Error(parsed.message)
  const valid = parsed.rows.filter((row) => row.status === 'valid')
  secrets = secretValues(valid)

  const client = createAirwallexClientFromEnv(recordingFetch)
  let loginToken = ''

  const record = async (
    id: string,
    blocking: boolean,
    run: () => Promise<string>,
  ): Promise<boolean> => {
    try {
      const detail = scrub(await run())
      checks.push({ id, blocking, result: 'pass', detail })
      return true
    } catch (error) {
      const detail = scrub(describeError(error))
      checks.push({ id, blocking, result: 'fail', detail })
      const latest = captures.at(-1)
      if (latest) fixtures.set(`${id}-error`, latest)
      return false
    }
  }

  let pricedBatchId = ''
  let pricedRunId = ''
  let payBatchId = ''
  let transferId = ''
  let transferField = ''

  await record('V1', true, async () => {
    const session = await client.login()
    loginToken = session.token
    secrets = [...secrets, session.token].sort((left, right) => right.length - left.length)
    if (session.token.length === 0) throw new Error('login returned an empty token')
    return 'login returned a bearer token'
  })

  await record('V2', true, async () => {
    const rows = await client.balances()
    fixtures.set('v2-balances', rows)
    const wallet = rows.find((row) => row.currency === env.SOURCE_CURRENCY)
    if (!wallet) throw new Error(`no ${env.SOURCE_CURRENCY} balance`)
    return `${env.SOURCE_CURRENCY} available ${wallet.available_amount}`
  })

  const schemas = await collectSchemas(client, valid)
  fixtures.set('schemas', schemas)

  const v3 = await record('V3', true, async () => {
    const created = await openBatch(client, 'smoke-v4.csv')
    pricedBatchId = created.id
    pricedRunId = created.requestRunId
    fixtures.set('v3-batch', created)
    if (created.status !== 'DRAFTING') throw new Error(`status ${created.status}`)
    return `${created.id} ${created.status}`
  })

  if (v3 && pricedBatchId) {
    await record('V4', true, async () => {
      const maya = rowOrThrow(valid, 'US', 'USD')
      await client.addItems(
        pricedBatchId,
        addItemsPayload([
          toDraft(maya, 'LOCAL', pricedRunId, maya.amount),
          toDraft(maya, 'SWIFT', pricedRunId, maya.amount),
        ]),
      )
      const items = await listSettled(client, pricedBatchId)
      fixtures.set('v4-items', items)
      const failed = items.filter((item) => item.status !== 'VALIDATED')
      if (failed.length > 0 || items.length !== 2) {
        throw new Error(items.map(itemLine).join(' | '))
      }
      const quoted = await quoteBatch(client, pricedBatchId)
      fixtures.set('v4-quote', quoted.body)
      const priced = await client.listItems(pricedBatchId)
      fixtures.set('v4-items', priced)
      for (const item of priced) {
        if (item.status === 'VALIDATED' && !item.transfer_draft?.amount_payer_pays) {
          throw new Error(`${item.request_id} has no amount_payer_pays after quote`)
        }
      }
      await client.getBatch(pricedBatchId)
      const before = countSnapshot(latestBatchBody(pricedBatchId))
      const loser = moreExpensive(priced)
      await client.deleteItems(pricedBatchId, [loser.id])
      const remaining = await client.listItems(pricedBatchId)
      const afterBatch = await client.getBatch(pricedBatchId)
      const after = countSnapshot(latestBatchBody(pricedBatchId))
      fixtures.set('v4-batch-after', latestBatchBody(pricedBatchId))
      if (remaining.length !== 1)
        throw new Error(`expected 1 item after delete, got ${remaining.length}`)
      return `deleted ${loser.request_id}; before ${before}; ${afterBatch.status} ${after}`
    })

    await record('V5', true, async () => {
      const quoted = await quoteBatch(client, pricedBatchId)
      fixtures.set('v5-quote', quoted.body)
      const summary = summarizeQuote(quoted.body)
      return `validity ${quoted.validity}; ${summary}`
    })
  } else {
    skip(checks, 'V4', true, 'V3 did not create a batch')
    skip(checks, 'V5', true, 'V3 did not create a batch')
  }

  const v6 = await record('V6', true, async () => {
    const maya = rowOrThrow(valid, 'US', 'USD')
    const created = await openBatch(client, 'smoke-v6.csv')
    payBatchId = created.id
    const runId = created.requestRunId
    await client.addItems(
      payBatchId,
      addItemsPayload([toDraft(maya, 'LOCAL', runId, SUBMIT_AMOUNT)]),
    )
    const items = await listSettled(client, payBatchId)
    const item = items[0]
    if (!item || item.status !== 'VALIDATED')
      throw new Error(items.map(itemLine).join(' | ') || 'no item')
    const quoted = await quoteBatch(client, payBatchId)
    fixtures.set('v6-quote', quoted.body)
    await client.submit(payBatchId)
    const batch = await client.getBatch(payBatchId)
    fixtures.set('v6-batch', batch)
    if (batch.status === 'IN_APPROVAL') throw new Error('submit stuck in IN_APPROVAL')
    if (!['SCHEDULED', 'BOOKING', 'BOOKED'].includes(batch.status)) {
      throw new Error(`status ${batch.status}`)
    }
    return `${SUBMIT_AMOUNT} USD → ${batch.status}`
  })

  if (v6 && payBatchId) {
    await record('V7', true, async () => {
      const found = await waitForTransfer(client, payBatchId)
      fixtures.set('v7-item', found.item)
      transferField = found.field
      transferId = found.transferId
      if (!found.transferId) throw new Error(found.field)
      const transfer = await client.getTransfer(found.transferId)
      fixtures.set('v7-transfer', transfer)
      return `${found.field}; transfer ${transfer.status}`
    })
  } else {
    skip(checks, 'V7', true, 'V6 did not submit')
  }

  await record('V8', true, async () => {
    const created = await openBatch(client, 'smoke-v8.csv')
    const runId = created.requestRunId
    await client.addItems(
      created.id,
      addItemsPayload(valid.map((row) => toDraft(row, 'LOCAL', runId))),
    )
    const items = await listSettled(client, created.id)
    const failed = items.filter((item) => item.status !== 'VALIDATED')
    if (items.length !== valid.length || failed.length > 0) {
      throw new Error(items.map(itemLine).join(' | '))
    }
    await quoteBatch(client, created.id)
    const priced = await client.listItems(created.id)
    fixtures.set('v8-items', priced)
    return priced.map(itemLine).join(' | ')
  })

  await record('V9', false, async () => {
    const priya = rowOrThrow(valid, 'IN', 'INR')
    const created = await openBatch(client, 'smoke-v9.csv')
    const runId = created.requestRunId
    try {
      await client.addItems(created.id, addItemsPayload([toDraft(priya, 'SWIFT', runId)]))
    } catch (error) {
      fixtures.set('v9-error', captures.at(-1) ?? null)
      return `add rejected: ${describeError(error)}`
    }
    const items = await listSettled(client, created.id)
    fixtures.set('v9-items', items)
    const item = items[0]
    if (item?.status === 'VALIDATED') throw new Error('INR SWIFT validated')
    return item ? itemLine(item) : 'no item returned'
  })

  await record('Q-06', false, async () => {
    const owen = rowOrThrow(valid, 'GB', 'GBP')
    const created = await openBatch(client, 'smoke-q06.csv')
    const runId = created.requestRunId
    try {
      await client.addItems(created.id, addItemsPayload([toDraft(owen, 'SWIFT', runId)]))
    } catch (error) {
      fixtures.set('q06-error', captures.at(-1) ?? null)
      return `add rejected: ${describeError(error)}`
    }
    const items = await listSettled(client, created.id)
    fixtures.set('q06-items', items)
    return items.map(itemLine).join(' | ')
  })

  if (transferId) {
    await record('V10', false, async () => {
      const note = await transitionToPaid(client, transferId)
      fixtures.set(
        'v10-transfer',
        captures.filter((entry) => entry.path.includes('/transfers/')),
      )
      return note
    })
  } else {
    skip(checks, 'V10', false, 'no transfer id from V7')
  }

  await record('V11', false, async () => {
    const runId = crypto.randomUUID()
    const requestId = `b:${runId}`
    const first = await client.createBatch(
      batchCreatePayload({ requestId, name: 'smoke-v11.csv', runId }),
    )
    draftIds.push(first.id)
    try {
      const second = await client.createBatch(
        batchCreatePayload({ requestId, name: 'smoke-v11.csv', runId }),
      )
      fixtures.set('v11-batches', { first: first.id, second: second.id })
      if (second.id !== first.id)
        throw new Error(`second batch ${second.id} differs from ${first.id}`)
      return `same batch ${first.id}`
    } catch (error) {
      if (error instanceof AirwallexError) {
        fixtures.set('v11-error', captures.at(-1) ?? null)
        return `second create rejected ${error.code}: ${error.message}`
      }
      throw error
    }
  })

  checks.push({
    id: 'V12',
    blocking: false,
    result: 'skip',
    detail: env.AIRWALLEX_WEBHOOK_SECRET
      ? 'webhook secret is set; no tunnel was started, so live delivery was not checked'
      : 'no webhook secret; live delivery was not checked',
  })

  await deleteDrafts(client)
  writeReport({
    env: env.AIRWALLEX_ENV,
    baseUrl: env.AIRWALLEX_BASE_URL,
    apiVersion: env.AIRWALLEX_API_VERSION,
    sourceCurrency: env.SOURCE_CURRENCY,
    checks,
    schemas,
    transferField,
    loginTokenUsed: loginToken.length > 0,
  })
  return checks
}

type OpenedBatch = { id: string; status: string; requestRunId: string }

async function openBatch(
  client: ReturnType<typeof createAirwallexClientFromEnv>,
  name: string,
): Promise<OpenedBatch> {
  const requestRunId = crypto.randomUUID()
  const created = await client.createBatch(
    batchCreatePayload({ requestId: `b:${requestRunId}`, name, runId: requestRunId }),
  )
  draftIds.push(created.id)
  return { id: created.id, status: created.status, requestRunId }
}

async function quoteBatch(
  client: ReturnType<typeof createAirwallexClientFromEnv>,
  batchId: string,
): Promise<{ validity: QuoteValidity; body: unknown }> {
  try {
    return { validity: 'HR_1', body: await client.quote(batchId, 'HR_1') }
  } catch (error) {
    if (!(error instanceof AirwallexError)) throw error
    return { validity: 'MIN_15', body: await client.quote(batchId, 'MIN_15') }
  }
}

async function listSettled(
  client: ReturnType<typeof createAirwallexClientFromEnv>,
  batchId: string,
): Promise<AirwallexItem[]> {
  let items: AirwallexItem[] = []
  for (let attempt = 0; attempt < 8; attempt += 1) {
    items = await client.listItems(batchId)
    const pending = items.some(
      (item) => item.status !== 'VALIDATED' && item.status !== 'VALIDATION_FAILED',
    )
    if (items.length > 0 && !pending) return items
    await sleep(1500)
  }
  return items
}

async function waitForTransfer(
  client: ReturnType<typeof createAirwallexClientFromEnv>,
  batchId: string,
): Promise<{ transferId: string; field: string; item: AirwallexItem | null }> {
  let item: AirwallexItem | null = null
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const batch = await client.getBatch(batchId)
    const items = await client.listItems(batchId)
    item = items[0] ?? null
    const located = locateTransferId(item)
    if (located.transferId) return { ...located, item }
    if (batch.status === 'IN_APPROVAL' || item?.status === 'BOOKING_FAILED') break
    await sleep(3000)
  }
  const located = locateTransferId(item)
  return { ...located, item }
}

function locateTransferId(item: AirwallexItem | null): { transferId: string; field: string } {
  if (!item) return { transferId: '', field: 'no item' }
  const record = item as AirwallexItem & Record<string, unknown>
  const keys = Object.keys(record).sort()
  if (typeof record.transfer_id === 'string' && record.transfer_id !== '') {
    return {
      transferId: record.transfer_id,
      field: `transfer_id on ${item.status}; keys ${keys.join(', ')}`,
    }
  }
  const draftId = item.transfer_draft?.id
  if (item.status === 'BOOKED' && draftId) {
    return { transferId: draftId, field: `transfer_draft.id on BOOKED; keys ${keys.join(', ')}` }
  }
  return {
    transferId: '',
    field: `status ${item.status}; keys ${keys.join(', ')}; transfer_draft.id ${draftId ?? 'none'}`,
  }
}

async function transitionToPaid(
  client: ReturnType<typeof createAirwallexClientFromEnv>,
  transferId: string,
): Promise<string> {
  const notes: string[] = []
  for (const step of ['SENT', 'PAID'] as const) {
    try {
      await client.transitionTransfer(transferId, step)
      const transfer = await client.getTransfer(transferId)
      notes.push(`${step} → ${transfer.status}`)
      if (transfer.status === 'PAID') return notes.join('; ')
    } catch (error) {
      notes.push(`${step} rejected: ${describeError(error)}`)
      break
    }
  }
  throw new Error(notes.join('; '))
}

async function collectSchemas(
  client: ReturnType<typeof createAirwallexClientFromEnv>,
  rows: readonly ParsedRow[],
): Promise<SchemaNote[]> {
  const queries = [
    ...rows.map((row) => ({ row, method: 'LOCAL' as const })),
    { row: rowOrThrow(rows, 'GB', 'GBP'), method: 'SWIFT' as const },
    { row: rowOrThrow(rows, 'IN', 'INR'), method: 'SWIFT' as const },
  ]
  const notes: SchemaNote[] = []
  for (const query of queries) {
    const label = `${query.row.country}-${query.row.currency}-${query.method}`
    try {
      const body = await client.beneficiarySchema({
        account_currency: query.row.currency,
        bank_country_code: query.row.country,
        country_code: query.row.country,
        entity_type: 'PERSONAL',
        transfer_method: query.method,
      })
      fixtures.set(`schema-${label}`, body)
      notes.push({ label, detail: schemaLine(body) })
    } catch (error) {
      fixtures.set(`schema-${label}-error`, captures.at(-1) ?? null)
      notes.push({ label, detail: describeError(error) })
    }
  }
  return notes
}

type SchemaNote = { label: string; detail: string }

function schemaLine(body: unknown): string {
  const fields = fieldsOf(body)
  const described = ADDRESS_FIELDS.map((fieldPath) => {
    const field = fields.find((item) => item.path === fieldPath)
    if (!field) return `${fieldPath}=absent`
    return `${fieldPath}=${field.required ? 'required' : 'optional'}`
  })
  const condition = conditionOf(body)
  const clearing = condition.local_clearing_system ?? 'absent'
  return `clearing ${clearing}; ${described.join(', ')}`
}

function fieldsOf(body: unknown): Array<{ path: string; required: boolean }> {
  if (typeof body !== 'object' || body === null || !('fields' in body)) return []
  const fields = (body as { fields?: unknown }).fields
  if (!Array.isArray(fields)) return []
  return fields.flatMap((field) => {
    if (typeof field !== 'object' || field === null) return []
    const record = field as { path?: unknown; required?: unknown }
    if (typeof record.path !== 'string') return []
    return [{ path: record.path, required: record.required === true }]
  })
}

function conditionOf(body: unknown): Record<string, string> {
  if (typeof body !== 'object' || body === null || !('condition' in body)) return {}
  const condition = (body as { condition?: unknown }).condition
  if (typeof condition !== 'object' || condition === null) return {}
  const entries: Record<string, string> = {}
  for (const [key, value] of Object.entries(condition)) {
    if (typeof value === 'string') entries[key] = value
  }
  return entries
}

function summarizeQuote(body: unknown): string {
  if (typeof body !== 'object' || body === null) return 'empty quote'
  const summary = (body as { quote_summary?: unknown }).quote_summary
  if (typeof summary !== 'object' || summary === null) {
    return `keys ${Object.keys(body).join(', ')}`
  }
  const record = summary as { expires_at?: unknown; quotes?: unknown; validity?: unknown }
  const quotes = Array.isArray(record.quotes) ? record.quotes.length : 'missing'
  return `expires_at ${String(record.expires_at ?? 'missing')}; quotes ${String(quotes)}`
}

function moreExpensive(items: readonly AirwallexItem[]): AirwallexItem {
  const ranked = [...items].sort((left, right) => {
    const leftPays = new Decimal(left.transfer_draft?.amount_payer_pays ?? '0')
    const rightPays = new Decimal(right.transfer_draft?.amount_payer_pays ?? '0')
    if (!leftPays.eq(rightPays)) return leftPays.cmp(rightPays)
    if (left.metadata?.candidate === 'S') return 1
    if (right.metadata?.candidate === 'S') return -1
    return 0
  })
  const loser = ranked.at(-1)
  if (!loser) throw new Error('no item to delete')
  return loser
}

function itemLine(item: AirwallexItem): string {
  const pays = item.transfer_draft?.amount_payer_pays ?? 'none'
  const clearing = item.transfer_draft?.beneficiary?.bank_details?.local_clearing_system || 'empty'
  const errors = (item.errors ?? [])
    .map((error) => error.source || error.code || error.message || 'error')
    .join(', ')
  const who = item.request_id.match(/:(\d+):([LS])$/)
  const label = who ? `${who[1]}:${who[2]}` : item.request_id
  return `${label} ${item.status} pays ${pays} clearing ${clearing}${errors ? ` (${errors})` : ''}`
}

function countSnapshot(body: unknown): string {
  if (typeof body !== 'object' || body === null) return 'no batch body'
  const parts: string[] = []
  for (const [key, value] of Object.entries(body)) {
    if (!/count|item/i.test(key)) continue
    if (typeof value === 'string' || typeof value === 'number') parts.push(`${key}=${value}`)
  }
  return parts.join(', ') || `keys ${Object.keys(body).join(', ')}`
}

function latestBatchBody(batchId: string): unknown {
  const hit = [...captures]
    .reverse()
    .find((entry) => entry.method === 'GET' && entry.path === `/api/v1/batch_transfers/${batchId}`)
  return hit?.body
}

function toDraft(
  row: ParsedRow,
  method: 'LOCAL' | 'SWIFT',
  runId: string,
  amount = row.amount,
): BatchItemDraft {
  return {
    requestId: `i:${runId}:${row.index}:${method === 'LOCAL' ? 'L' : 'S'}`,
    transferMethod: method,
    sourceCurrency: getServerEnv().SOURCE_CURRENCY,
    transferCurrency: row.currency,
    transferAmount: amount,
    reference: `PAY-${row.index}`,
    metadata: { row: String(row.index), candidate: method === 'LOCAL' ? 'L' : 'S' },
    beneficiary: {
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      dateOfBirth: row.dateOfBirth,
      address: {
        street: row.street,
        city: row.city,
        state: row.state,
        postcode: row.postcode,
        countryCode: row.country,
      },
      accountName: row.contractorName,
      accountCurrency: row.currency,
      bankCountryCode: row.country,
      accountNumber: row.accountNumber,
      iban: row.iban,
      routingType: row.routingType,
      routingValue: row.routingValue,
      swiftBic: row.swiftBic,
    },
  }
}

function rowOrThrow(rows: readonly ParsedRow[], country: string, currency: string): ParsedRow {
  const row = rows.find((item) => item.country === country && item.currency === currency)
  if (!row) throw new Error(`sample is missing ${country}/${currency}`)
  return row
}

async function deleteDrafts(
  client: ReturnType<typeof createAirwallexClientFromEnv>,
): Promise<void> {
  for (const batchId of draftIds) {
    try {
      const batch = await client.getBatch(batchId)
      if (batch.status === 'DRAFTING') await client.deleteBatch(batchId)
    } catch {
      // A submitted batch, or one already deleted, is left as-is.
    }
  }
}

function skip(checks: Check[], id: string, blocking: boolean, detail: string): void {
  checks.push({ id, blocking, result: 'skip', detail })
}

function writeReport(input: {
  env: string
  baseUrl: string
  apiVersion: string
  sourceCurrency: string
  checks: Check[]
  schemas: SchemaNote[]
  transferField: string
  loginTokenUsed: boolean
}): void {
  mkdirSync(FIXTURES, { recursive: true })
  for (const [name, value] of fixtures) {
    writeFileSync(
      path.join(FIXTURES, `${name}.json`),
      `${scrub(JSON.stringify(redact(value), null, 2))}\n`,
    )
  }
  const recorded = new Date().toISOString()
  const table = input.checks
    .map((check) => `| ${check.id} | ${check.result} | ${check.detail.replaceAll('\n', ' ')} |`)
    .join('\n')
  const schemaTable = input.schemas
    .map((note) => `| ${note.label} | ${scrub(note.detail).replaceAll('|', '/')} |`)
    .join('\n')
  const markdown = `# Sandbox verification

Recorded ${recorded}. Environment \`${input.env}\`, base URL \`${input.baseUrl}\`, API version \`${input.apiVersion}\`, source currency \`${input.sourceCurrency}\`.

Redacted responses are in \`src/server/adapters/airwallex/__fixtures__/\`. Account numbers, IBANs, routing values, and credentials are replaced with \`[Redacted]\`.

| ID | Result | Detail |
| --- | --- | --- |
${table}

## Beneficiary schema

\`POST /api/v1/beneficiary_api_schemas/generate\` with \`entity_type=PERSONAL\` and no \`local_clearing_system\`.

| Corridor | Detail |
| --- | --- |
${schemaTable}

## Transfer id

${scrub(input.transferField) || 'not observed'}
`
  writeFileSync(RESULTS, markdown)
  if (!input.loginTokenUsed) return
}

function secretValues(rows: readonly ParsedRow[]): string[] {
  const values = [
    process.env.AIRWALLEX_API_KEY,
    process.env.AIRWALLEX_CLIENT_ID,
    process.env.AIRWALLEX_WEBHOOK_SECRET,
    ...rows.flatMap((row) => [row.accountNumber, row.iban, row.routingValue]),
  ]
  return values
    .filter((value): value is string => typeof value === 'string' && value.length >= 6)
    .sort((left, right) => right.length - left.length)
}

function scrub(text: string): string {
  let out = text
  for (const secret of secrets) out = out.split(secret).join('[Redacted]')
  return out
}

const REDACTED_KEYS = new Set([
  'apiKey',
  'api_key',
  'token',
  'access_token',
  'authorization',
  'account_number',
  'accountNumber',
  'iban',
  'routing_value',
  'routingValue',
  'account_routing_value1',
])

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => redact(entry))
  if (typeof value === 'object' && value !== null) {
    const output: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value)) {
      output[key] = REDACTED_KEYS.has(key) || key === 'payer' ? '[Redacted]' : redact(child)
    }
    return output
  }
  return value
}

function describeError(error: unknown): string {
  if (error instanceof AirwallexError) {
    const fields = error.fieldErrors.map((field) => `${field.path}: ${field.message}`).join('; ')
    return `HTTP ${error.status} ${error.code}: ${error.message}${fields ? ` (${fields})` : ''}`
  }
  if (error instanceof Error) return error.message
  return 'unknown error'
}

const recordingFetch: AirwallexFetch = async (url, init) => {
  const response = await fetch(url, init)
  const text = await response.clone().text()
  let body: unknown = text
  if (text.trim() !== '') {
    try {
      body = parseJsonLossless(text)
    } catch {
      body = text.slice(0, 500)
    }
  } else {
    body = null
  }
  const parsed = new URL(url)
  captures.push({
    method: init.method ?? 'GET',
    path: `${parsed.pathname}${parsed.search}`,
    status: response.status,
    body: redact(body),
  })
  return response
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
