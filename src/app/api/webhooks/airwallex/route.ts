import { getServerEnv } from '@/server/env'
import { handleRoute } from '@/server/services/http'
import { getRunService } from '@/server/services/runs'
import { receiveAirwallexWebhook } from '@/server/services/webhooks'

export const runtime = 'nodejs'

export function POST(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const status = await receiveAirwallexWebhook(
      {
        rawBody: await request.text(),
        timestamp: request.headers.get('x-timestamp'),
        signature: request.headers.get('x-signature'),
        secret: getServerEnv().AIRWALLEX_WEBHOOK_SECRET,
      },
      (event) => getRunService().applyWebhook(event),
    )
    return new Response(null, { status })
  })
}
