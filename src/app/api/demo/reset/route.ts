import { z } from 'zod'
import { handleRoute, jsonResult } from '@/server/services/http'
import { getRunService } from '@/server/services/runs'

export const runtime = 'nodejs'

const ResetSchema = z.object({ ok: z.literal(true) })

export function POST(): Promise<Response> {
  return handleRoute(async () => {
    if (process.env.DEMO_MODE !== 'true') return new Response(null, { status: 404 })
    await getRunService().reset()
    return jsonResult(200, ResetSchema.parse({ ok: true }))
  })
}
