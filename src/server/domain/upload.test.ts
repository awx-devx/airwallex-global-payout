import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CSV_HEADER,
  FILE_ERROR_MESSAGES,
  SAMPLE_CONTRACTORS_CSV,
  type CsvColumn,
} from '@/contracts'
import { parseUpload } from '@/server/domain/upload'

const MAYA: Record<CsvColumn, string> = {
  contractor_name: 'Maya Chen',
  email: 'maya.chen@example.com',
  date_of_birth: '1991-04-12',
  country: 'US',
  currency: 'USD',
  amount: '42.00',
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

describe('parseUpload', () => {
  it('keeps row errors on the sample and wraps file failures in the envelope', () => {
    const disk = readFileSync(
      path.resolve(import.meta.dirname, '../../../docs/samples/contractors.csv'),
      'utf8',
    )
    const sample = parseUpload({ text: disk, fileName: 'contractors.csv' })
    expect(sample.ok).toBe(true)
    if (!sample.ok) return
    expect(sample.rows).toHaveLength(7)
    expect(sample.rows.find((row) => row.contractorName === 'Sam Rivera')).toMatchObject({
      status: 'invalid',
      fieldErrors: [{ path: 'postcode', message: 'postcode is required.' }],
    })

    expect(
      parseUpload({
        text: SAMPLE_CONTRACTORS_CSV.replace(/\n/g, '\r\n'),
        fileName: 'contractors.csv',
      }).ok,
    ).toBe(true)
    expect(parseUpload({ text: 'name,email\nA,a@b.com\n', fileName: 'bad.csv' })).toEqual({
      ok: false,
      envelope: {
        error: { code: 'UNSUPPORTED_FILE', message: FILE_ERROR_MESSAGES.UNSUPPORTED_FILE },
      },
    })
    expect(parseUpload({ text: SAMPLE_CONTRACTORS_CSV, fileName: 'notes.txt' })).toEqual({
      ok: false,
      envelope: {
        error: { code: 'UNSUPPORTED_FILE', message: FILE_ERROR_MESSAGES.UNSUPPORTED_FILE },
      },
    })
    expect(parseUpload({ text: `${CSV_HEADER.join(',')}\n`, fileName: 'empty.csv' })).toEqual({
      ok: false,
      envelope: { error: { code: 'EMPTY_FILE', message: FILE_ERROR_MESSAGES.EMPTY_FILE } },
    })
    expect(
      parseUpload({ text: csv(Array.from({ length: 26 }, () => ({}))), fileName: 'big.csv' }),
    ).toEqual({
      ok: false,
      envelope: { error: { code: 'TOO_MANY_ROWS', message: FILE_ERROR_MESSAGES.TOO_MANY_ROWS } },
    })
    expect(
      parseUpload({ text: csv([{}]), fileName: 'one.csv', byteLength: 1024 * 1024 + 1 }),
    ).toEqual({
      ok: false,
      envelope: { error: { code: 'FILE_TOO_LARGE', message: FILE_ERROR_MESSAGES.FILE_TOO_LARGE } },
    })
  })

  it('leaves a bad amount, a single name, and an unsupported corridor on the row', () => {
    const amount = parseUpload({
      text: csv([{ amount: '' }]),
      fileName: 'amount.csv',
    })
    const name = parseUpload({
      text: csv([{ contractor_name: 'Maya' }]),
      fileName: 'name.csv',
    })
    const corridor = parseUpload({
      text: csv([{ country: 'FR', currency: 'EUR' }]),
      fileName: 'corridor.csv',
    })
    expect(amount.ok && amount.rows[0]?.status).toBe('invalid')
    expect(name.ok && name.rows[0]?.fieldErrors[0]?.code).toBe('BAD_NAME')
    expect(corridor.ok && corridor.rows[0]?.fieldErrors[0]?.code).toBe('UNSUPPORTED_CORRIDOR')
  })
})
