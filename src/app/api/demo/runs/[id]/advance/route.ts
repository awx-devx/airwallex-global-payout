import { RunDetailSchema } from '@/contracts'
import { handleRoute, jsonResult } from '@/server/services/http'
import { getRunService } from '@/server/services/runs'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

export function POST(_request: Request, context: Context): Promise<Response> {
  return handleRoute(async () => {
    if (process.env.DEMO_MODE !== 'true') return new Response(null, { status: 404 })
    const { id } = await context.params
    const detail = await getRunService().advance(id)
    return jsonResult(200, RunDetailSchema.parse(detail))
  })
}
