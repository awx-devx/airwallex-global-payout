import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CSV_HEADER, parseContractorCsv, type CsvColumn } from './csv'
import { csvPathForAirwallexSource } from './field-paths'
import { SAMPLE_CONTRACTORS_CSV } from './sample-csv'

const MAYA: Record<CsvColumn, string> = {
  contractor_name: 'Maya Chen',
  email: 'maya.chen@example.com',
  date_of_birth: '1991-04-12',
  country: 'US',
  currency: 'USD',
  amount: '4200.00',
  street: '412 5th Avenue',
  city: 'Seattle',
  state: 'WA',
  postcode: '98104',
  account_number: '50001121',
  iban: '',
  routing_type: 'aba',
  routing_value: '021000021',
  swift_bic: 'CHASUS33',
}

function csv(rows: Array<Partial<Record<CsvColumn, string>>>): string {
  const lines = rows.map((row) => CSV_HEADER.map((column) => row[column] ?? MAYA[column]).join(','))
  return `${CSV_HEADER.join(',')}\n${lines.join('\n')}\n`
}

describe('parseContractorCsv', () => {
  it('accepts the sample file and flags Sam Rivera on postcode', () => {
    const disk = readFileSync(path.resolve(import.meta.dirname, '../../docs/samples/contractors.csv'), 'utf8')
    expect(disk).toBe(SAMPLE_CONTRACTORS_CSV)

    const parsed = parseContractorCsv({ text: disk, fileName: 'contractors.csv' })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.rows).toHaveLength(7)
    expect(parsed.rows.filter((row) => row.status === 'valid')).toHaveLength(6)
    const sam = parsed.rows.find((row) => row.contractorName === 'Sam Rivera')
    expect(sam).toMatchObject({
      id: 'row_7',
      status: 'invalid',
      fieldErrors: [{ code: 'MISSING_VALUE', path: 'postcode', message: 'postcode is required.' }],
    })
    const maya = parsed.rows[0]
    expect(maya?.firstName).toBe('Maya')
    expect(maya?.lastName).toBe('Chen')
    expect(parsed.rows.find((row) => row.contractorName === 'Priya Nair')?.status).toBe('valid')
  })

  it('accepts CRLF and rejects a bad header, a text file, an empty file, and 26 rows', () => {
    const crlf = SAMPLE_CONTRACTORS_CSV.replace(/\n/g, '\r\n')
    expect(parseContractorCsv({ text: crlf, fileName: 'contractors.csv' }).ok).toBe(true)

    expect(parseContractorCsv({ text: 'name,email\nA,a@b.com\n', fileName: 'bad.csv' })).toMatchObject({
      ok: false,
      code: 'UNSUPPORTED_FILE',
    })
    expect(parseContractorCsv({ text: SAMPLE_CONTRACTORS_CSV, fileName: 'notes.txt' })).toMatchObject({
      ok: false,
      code: 'UNSUPPORTED_FILE',
    })
    expect(parseContractorCsv({ text: `${CSV_HEADER.join(',')}\n`, fileName: 'empty.csv' })).toMatchObject({
      ok: false,
      code: 'EMPTY_FILE',
    })
    expect(parseContractorCsv({ text: csv(Array.from({ length: 26 }, () => ({}))), fileName: 'big.csv' })).toMatchObject({
      ok: false,
      code: 'TOO_MANY_ROWS',
    })
    expect(parseContractorCsv({ text: csv([{}]), fileName: 'one.csv', byteLength: 1024 * 1024 + 1 })).toMatchObject({
      ok: false,
      code: 'FILE_TOO_LARGE',
    })
  })

  it('rejects an empty amount, a single-word name, and FR/EUR on the row', () => {
    const amount = parseContractorCsv({ text: csv([{ amount: '' }]), fileName: 'amount.csv' })
    expect(amount.ok).toBe(true)
    if (!amount.ok) return
    expect(amount.rows[0]?.fieldErrors).toContainEqual({
      code: 'MISSING_VALUE',
      path: 'amount',
      message: 'amount is required.',
    })

    const name = parseContractorCsv({ text: csv([{ contractor_name: 'Prince' }]), fileName: 'name.csv' })
    expect(name.ok).toBe(true)
    if (!name.ok) return
    expect(name.rows[0]?.fieldErrors).toContainEqual({
      code: 'BAD_NAME',
      path: 'contractor_name',
      message: 'Use a first and last name.',
    })

    const corridor = parseContractorCsv({
      text: csv([{ country: 'FR', currency: 'EUR' }]),
      fileName: 'fr.csv',
    })
    expect(corridor.ok).toBe(true)
    if (!corridor.ok) return
    expect(corridor.rows[0]?.status).toBe('invalid')
    expect(corridor.rows[0]?.fieldErrors).toContainEqual({
      code: 'UNSUPPORTED_CORRIDOR',
      path: 'country',
      message: 'FR/EUR is not in this demo.',
    })
  })

  it('rejects a non-positive or over-precise amount and a missing bank field', () => {
    for (const amount of ['0', '-1', '1.001', 'abc']) {
      const parsed = parseContractorCsv({ text: csv([{ amount }]), fileName: 'amount.csv' })
      expect(parsed.ok).toBe(true)
      if (!parsed.ok) return
      expect(parsed.rows[0]?.fieldErrors.some((error) => error.code === 'BAD_AMOUNT')).toBe(true)
    }

    const sepa = parseContractorCsv({ text: csv([{ country: 'DE', currency: 'EUR', iban: '' }]), fileName: 'de.csv' })
    expect(sepa.ok).toBe(true)
    if (!sepa.ok) return
    expect(sepa.rows[0]?.fieldErrors).toContainEqual({
      code: 'MISSING_BANK_FIELD',
      path: 'iban',
      message: 'iban is required for DE.',
    })
  })
})

describe('csvPathForAirwallexSource', () => {
  it('maps beneficiary sources onto CSV columns', () => {
    expect(csvPathForAirwallexSource('beneficiary.address.postcode')).toBe('postcode')
    expect(csvPathForAirwallexSource('beneficiary.bank_details.swift_code')).toBe('swift_bic')
    expect(csvPathForAirwallexSource('beneficiary.first_name')).toBe('contractor_name')
    expect(csvPathForAirwallexSource('beneficiary.address.country_code')).toBe('country')
    expect(csvPathForAirwallexSource('transfer.unknown')).toBe('row')
  })
})
