import type { FieldError } from '@/contracts'

export class AirwallexError extends Error {
  readonly status: number
  readonly code: string
  readonly source: string | null
  readonly fieldErrors: FieldError[]
  readonly traceId: string | null

  constructor(input: {
    status: number
    code: string
    message: string
    source: string | null
    fieldErrors: FieldError[]
    traceId: string | null
  }) {
    super(input.message)
    this.name = 'AirwallexError'
    this.status = input.status
    this.code = input.code
    this.source = input.source
    this.fieldErrors = input.fieldErrors
    this.traceId = input.traceId
  }
}
