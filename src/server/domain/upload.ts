import {
  parseContractorCsv,
  type ErrorEnvelope,
  type ParseCsvInput,
  type ParsedRow,
} from '@/contracts'

export type UploadParse = { ok: true; rows: ParsedRow[] } | { ok: false; envelope: ErrorEnvelope }

/** File-level CSV failures become the error envelope. Row errors stay on the rows. */
export function parseUpload(input: ParseCsvInput): UploadParse {
  const parsed = parseContractorCsv(input)
  if (!parsed.ok) {
    return {
      ok: false,
      envelope: {
        error: {
          code: parsed.code,
          message: parsed.message,
        },
      },
    }
  }
  return { ok: true, rows: parsed.rows }
}
