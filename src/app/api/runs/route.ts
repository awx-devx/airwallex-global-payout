import { ContractError, FILE_ERROR_MESSAGES, RunDetailSchema, RunSummarySchema } from '@/contracts'
import { handleRoute, jsonResult } from '@/server/services/http'
import { getRunService } from '@/server/services/runs'
import { z } from 'zod'

export const runtime = 'nodejs'

const RunListSchema = z.object({ runs: z.array(RunSummarySchema) })

export function GET(): Promise<Response> {
  return handleRoute(async () => {
    const runs = await getRunService().listRuns()
    return jsonResult(200, RunListSchema.parse({ runs }))
  })
}

export function POST(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      throw new ContractError(400, 'UNSUPPORTED_FILE', FILE_ERROR_MESSAGES.UNSUPPORTED_FILE)
    }
    const detail = await getRunService().createRun({
      fileName: file.name,
      text: await file.text(),
      byteLength: file.size,
    })
    return jsonResult(201, RunDetailSchema.parse(detail))
  })
}
