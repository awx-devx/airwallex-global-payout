import { RunDetailSchema } from '@/contracts'
import { handleRoute, jsonResult } from '@/server/services/http'
import { getRunService } from '@/server/services/runs'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

export function GET(_request: Request, context: Context): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params
    const detail = await getRunService().getRun(id)
    return jsonResult(200, RunDetailSchema.parse(detail))
  })
}
