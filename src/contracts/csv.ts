import { isPayoutCurrency, payoutPrecision, toMoneyString } from './currencies'
import { FILE_ERROR_MESSAGES, rowErrorMessage, type FileErrorCode, type RowErrorCode } from './errors'
import type { FieldError } from './schemas'
import Decimal from 'decimal.js'

export const CSV_HEADER = [
  'contractor_name',
  'email',
  'date_of_birth',
  'country',
  'currency',
  'amount',
  'street',
  'city',
  'state',
  'postcode',
  'account_number',
  'iban',
  'routing_type',
  'routing_value',
  'swift_bic',
] as const

export type CsvColumn = (typeof CSV_HEADER)[number]

export const MAX_CSV_BYTES = 1024 * 1024
export const MAX_CSV_ROWS = 25

const STATE_REQUIRED = new Set(['US', 'AU'])

type BankField = 'account_number' | 'iban' | 'routing_type' | 'routing_value' | 'swift_bic'

type Corridor = {
  country: string
  currency: string
  routingType: string | null
  bankFields: readonly BankField[]
}

export const DEMO_CORRIDORS: readonly Corridor[] = [
  {
    country: 'US',
    currency: 'USD',
    routingType: 'aba',
    bankFields: ['account_number', 'routing_type', 'routing_value', 'swift_bic'],
  },
  {
    country: 'GB',
    currency: 'GBP',
    routingType: 'sort_code',
    bankFields: ['account_number', 'routing_type', 'routing_value', 'iban', 'swift_bic'],
  },
  {
    country: 'DE',
    currency: 'EUR',
    routingType: null,
    bankFields: ['iban', 'swift_bic'],
  },
  {
    country: 'AU',
    currency: 'AUD',
    routingType: 'bsb',
    bankFields: ['account_number', 'routing_type', 'routing_value', 'swift_bic'],
  },
  {
    country: 'SG',
    currency: 'SGD',
    routingType: null,
    bankFields: ['account_number', 'swift_bic'],
  },
  {
    country: 'IN',
    currency: 'INR',
    routingType: 'bank_code',
    bankFields: ['account_number', 'routing_type', 'routing_value'],
  },
]

export type CsvFieldError = FieldError & { code: RowErrorCode }

export type ParsedRow = {
  id: string
  index: number
  contractorName: string
  firstName: string
  lastName: string
  email: string
  dateOfBirth: string
  country: string
  currency: string
  amount: string
  street: string
  city: string
  state: string
  postcode: string
  accountNumber: string
  iban: string
  routingType: string
  routingValue: string
  swiftBic: string
  status: 'valid' | 'invalid'
  fieldErrors: CsvFieldError[]
}

export type ParseCsvInput = {
  text: string
  fileName?: string
  byteLength?: number
}

export type ParseCsvResult =
  | { ok: true; rows: ParsedRow[] }
  | { ok: false; code: FileErrorCode; message: string }

export function parseContractorCsv(input: ParseCsvInput): ParseCsvResult {
  if (input.fileName && !input.fileName.toLowerCase().endsWith('.csv')) {
    return fileError('UNSUPPORTED_FILE')
  }

  const byteLength = input.byteLength ?? new TextEncoder().encode(input.text).length
  if (byteLength > MAX_CSV_BYTES) return fileError('FILE_TOO_LARGE')

  const table = splitCsv(input.text)
  if (!table) return fileError('UNSUPPORTED_FILE')

  const [header, ...data] = table
  if (!header || !sameHeader(header)) return fileError('UNSUPPORTED_FILE')
  if (data.length === 0) return fileError('EMPTY_FILE')
  if (data.length > MAX_CSV_ROWS) return fileError('TOO_MANY_ROWS')

  return { ok: true, rows: data.map((cells, index) => parseRow(cells, index + 1)) }
}

function fileError(code: FileErrorCode): ParseCsvResult {
  return { ok: false, code, message: FILE_ERROR_MESSAGES[code] }
}

function sameHeader(header: readonly string[]): boolean {
  return header.length === CSV_HEADER.length && CSV_HEADER.every((column, index) => header[index] === column)
}

function parseRow(cells: readonly string[], index: number): ParsedRow {
  const cell = (column: CsvColumn) => cells[CSV_HEADER.indexOf(column)]?.trim() ?? ''
  const contractorName = cell('contractor_name')
  const email = cell('email')
  const dateOfBirth = cell('date_of_birth')
  const country = cell('country')
  const currency = cell('currency')
  const amountRaw = cell('amount')
  const street = cell('street')
  const city = cell('city')
  const state = cell('state')
  const postcode = cell('postcode')
  const accountNumber = cell('account_number')
  const iban = cell('iban')
  const routingType = cell('routing_type')
  const routingValue = cell('routing_value')
  const swiftBic = cell('swift_bic')

  const errors: CsvFieldError[] = []
  const name = splitName(contractorName)
  if (!contractorName) {
    errors.push(issue('MISSING_VALUE', 'contractor_name'))
  } else if (!name) {
    errors.push(issue('BAD_NAME', 'contractor_name'))
  }

  if (!email) errors.push(issue('MISSING_VALUE', 'email'))
  else if (!email.includes('@')) errors.push(issue('BAD_EMAIL', 'email'))

  if (!dateOfBirth) errors.push(issue('MISSING_VALUE', 'date_of_birth'))
  else if (!isIsoDate(dateOfBirth)) errors.push(issue('BAD_DATE', 'date_of_birth'))

  const corridor = DEMO_CORRIDORS.find((item) => item.country === country && item.currency === currency)
  if (!country || !currency) {
    if (!country) errors.push(issue('MISSING_VALUE', 'country'))
    if (!currency) errors.push(issue('MISSING_VALUE', 'currency'))
  } else if (!corridor) {
    errors.push(issue('UNSUPPORTED_CORRIDOR', 'country', country, currency))
  }

  const amount = parseAmount(amountRaw, currency)
  if (!amount.ok) errors.push(issue(amount.code, 'amount'))

  if (!street) errors.push(issue('MISSING_VALUE', 'street'))
  if (!city) errors.push(issue('MISSING_VALUE', 'city'))
  if (!postcode) errors.push(issue('MISSING_VALUE', 'postcode'))
  if (STATE_REQUIRED.has(country) && !state) errors.push(issue('MISSING_VALUE', 'state'))

  if (corridor) {
    const bank: Record<BankField, string> = {
      account_number: accountNumber,
      iban,
      routing_type: routingType,
      routing_value: routingValue,
      swift_bic: swiftBic,
    }
    for (const field of corridor.bankFields) {
      const value = bank[field]
      const routingMismatch = field === 'routing_type' && value !== '' && value !== corridor.routingType
      if (!value || routingMismatch) errors.push(issue('MISSING_BANK_FIELD', field, country))
    }
  }

  return {
    id: `row_${index}`,
    index,
    contractorName,
    firstName: name?.firstName ?? '',
    lastName: name?.lastName ?? '',
    email,
    dateOfBirth,
    country,
    currency,
    amount: amount.ok ? amount.value : amountRaw,
    street,
    city,
    state,
    postcode,
    accountNumber,
    iban,
    routingType,
    routingValue,
    swiftBic,
    status: errors.length === 0 ? 'valid' : 'invalid',
    fieldErrors: errors,
  }
}

function issue(code: RowErrorCode, column: string, country = '', currency = ''): CsvFieldError {
  return {
    code,
    path: column,
    message: rowErrorMessage(code, column, country, currency),
  }
}

function splitName(name: string): { firstName: string; lastName: string } | null {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const firstName = parts[0]
  if (!firstName || parts.length < 2) return null
  return { firstName, lastName: parts.slice(1).join(' ') }
}

function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function parseAmount(
  raw: string,
  currency: string,
): { ok: true; value: string } | { ok: false; code: 'MISSING_VALUE' | 'BAD_AMOUNT' } {
  if (!raw) return { ok: false, code: 'MISSING_VALUE' }
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(raw)) return { ok: false, code: 'BAD_AMOUNT' }
  const amount = new Decimal(raw)
  if (!amount.isFinite() || amount.lte(0)) return { ok: false, code: 'BAD_AMOUNT' }
  const places = isPayoutCurrency(currency) ? payoutPrecision(currency) : 2
  if (amount.decimalPlaces() > places) return { ok: false, code: 'BAD_AMOUNT' }
  return { ok: true, value: toMoneyString(amount, isPayoutCurrency(currency) ? currency : 'USD') }
}

function splitCsv(text: string): string[][] | null {
  const source = text.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  let rowStarted = false

  const pushRow = () => {
    if (!rowStarted && cell.trim() === '') {
      row = []
      cell = ''
      return
    }
    row.push(cell.trim())
    rows.push(row)
    row = []
    cell = ''
    rowStarted = false
  }

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (char == null) break

    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"'
          index += 1
        } else {
          inQuotes = false
        }
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      rowStarted = true
      continue
    }
    if (char === ',') {
      row.push(cell.trim())
      cell = ''
      rowStarted = true
      continue
    }
    if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1
      pushRow()
      continue
    }
    cell += char
    rowStarted = true
  }

  if (inQuotes) return null
  if (rowStarted || cell.trim() !== '') pushRow()
  return rows
}
