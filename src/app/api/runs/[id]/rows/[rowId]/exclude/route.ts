import { RunDetailSchema } from '@/contracts'
import { handleRoute, jsonResult } from '@/server/services/http'
import { getRunService } from '@/server/services/runs'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string; rowId: string }> }

export function POST(_request: Request, context: Context): Promise<Response> {
  return handleRoute(async () => {
    const { id, rowId } = await context.params
    const detail = await getRunService().excludeRow(id, rowId)
    return jsonResult(200, RunDetailSchema.parse(detail))
  })
}
