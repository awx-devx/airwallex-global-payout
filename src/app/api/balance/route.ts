import { BalanceSchema } from '@/contracts'
import { handleRoute, jsonResult } from '@/server/services/http'
import { getRunService } from '@/server/services/runs'

export const runtime = 'nodejs'

export function GET(): Promise<Response> {
  return handleRoute(async () => {
    const balance = await getRunService().getBalance()
    return jsonResult(200, BalanceSchema.parse(balance))
  })
}
