import type { ErrorEnvelope, FieldError } from './schemas'

export class ContractError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors?: FieldError[]

  constructor(status: number, code: string, message: string, fieldErrors?: FieldError[]) {
    super(message)
    this.name = 'ContractError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }

  toEnvelope(): ErrorEnvelope {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.fieldErrors && this.fieldErrors.length > 0
          ? { fieldErrors: this.fieldErrors }
          : {}),
      },
    }
  }
}

export const FILE_ERROR_CODES = [
  'UNSUPPORTED_FILE',
  'EMPTY_FILE',
  'FILE_TOO_LARGE',
  'TOO_MANY_ROWS',
] as const

export type FileErrorCode = (typeof FILE_ERROR_CODES)[number]

export const FILE_ERROR_MESSAGES: Record<FileErrorCode, string> = {
  UNSUPPORTED_FILE: 'Upload a CSV with the contractor header.',
  EMPTY_FILE: 'The file has no contractors.',
  FILE_TOO_LARGE: 'File is larger than 1 MB.',
  TOO_MANY_ROWS: 'A file can include at most 25 contractors.',
}

export const ROW_ERROR_CODES = [
  'MISSING_VALUE',
  'BAD_AMOUNT',
  'BAD_DATE',
  'BAD_NAME',
  'BAD_EMAIL',
  'UNSUPPORTED_CORRIDOR',
  'MISSING_BANK_FIELD',
] as const

export type RowErrorCode = (typeof ROW_ERROR_CODES)[number]

export function rowErrorMessage(
  code: RowErrorCode,
  column: string,
  country = '',
  currency = '',
): string {
  switch (code) {
    case 'MISSING_VALUE':
      return `${column} is required.`
    case 'BAD_AMOUNT':
      return 'Amount must be a positive number.'
    case 'BAD_DATE':
      return 'Date of birth must be YYYY-MM-DD.'
    case 'BAD_NAME':
      return 'Use a first and last name.'
    case 'BAD_EMAIL':
      return 'Email is invalid.'
    case 'UNSUPPORTED_CORRIDOR':
      return `${country}/${currency} is not in this demo.`
    case 'MISSING_BANK_FIELD':
      return `${column} is required for ${country}.`
    default:
      return assertNever(code)
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`)
}
