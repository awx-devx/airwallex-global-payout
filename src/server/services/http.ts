import { ContractError, ErrorEnvelopeSchema } from '@/contracts'
import { AirwallexError } from '@/server/adapters/airwallex/errors'

export function jsonResult(status: number, body: unknown): Response {
  return Response.json(body, { status })
}

export async function handleRoute(work: () => Promise<Response>): Promise<Response> {
  try {
    return await work()
  } catch (error) {
    if (error instanceof ContractError) {
      return jsonResult(error.status, ErrorEnvelopeSchema.parse(error.toEnvelope()))
    }
    if (error instanceof AirwallexError) {
      return jsonResult(
        502,
        ErrorEnvelopeSchema.parse({
          error: { code: 'AIRWALLEX_ERROR', message: error.message },
        }),
      )
    }
    throw error
  }
}
