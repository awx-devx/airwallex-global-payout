import { recordWebhookEvent, verifyWebhookSignature } from '@/server/adapters/airwallex/webhooks'

export type WebhookNotice = {
  name: string
  resourceId: string | null
}

export async function receiveAirwallexWebhook(
  input: {
    rawBody: string
    timestamp: string | null
    signature: string | null
    secret: string | undefined
    now?: number
  },
  apply: (event: WebhookNotice) => Promise<void>,
): Promise<number> {
  if (!input.secret || !input.timestamp || !input.signature) return 400
  const verified = verifyWebhookSignature({
    secret: input.secret,
    timestamp: input.timestamp,
    rawBody: input.rawBody,
    signature: input.signature,
    now: input.now,
  })
  if (!verified) return 400

  const event = readEvent(input.rawBody)
  if (!event) return 400
  const recorded = await recordWebhookEvent(event.id)
  if (recorded === 'duplicate') return 200
  await apply({ name: event.name, resourceId: event.resourceId })
  return 200
}

function readEvent(
  rawBody: string,
): { id: string; name: string; resourceId: string | null } | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawBody) as unknown
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
  const record = parsed as Record<string, unknown>
  if (typeof record.id !== 'string' || record.id === '') return null
  if (typeof record.name !== 'string' || record.name === '') return null
  return { id: record.id, name: record.name, resourceId: resourceId(record.data) }
}

function resourceId(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null
  const record = data as Record<string, unknown>
  const nested = record.object
  if (typeof nested === 'object' && nested !== null && !Array.isArray(nested)) {
    const id = (nested as Record<string, unknown>).id
    if (typeof id === 'string' && id !== '') return id
  }
  return typeof record.id === 'string' && record.id !== '' ? record.id : null
}
