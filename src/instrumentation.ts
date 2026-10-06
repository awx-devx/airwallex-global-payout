export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { parseServerEnv } = await import('@/server/env')
  parseServerEnv(process.env)

  const { logger } = await import('@/server/logger')
  logger.info('server environment ok')
}
