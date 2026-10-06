const WINDOW_MS = 1_000
const MAX_SPINS = 50

export type RateLimiter = {
  acquire(route: string): Promise<void>
}

export function retryDelayMs(failureIndex: number, random: () => number): number {
  const exponential = Math.min(5_000, 200 * 2 ** failureIndex)
  return Math.round(exponential * (1 + random() * 0.2))
}

export function createRateLimiter(options?: {
  now?: () => number
  sleep?: (ms: number) => Promise<void>
  globalPerSecond?: number
  routePerSecond?: number
}): RateLimiter {
  const now = options?.now ?? (() => Date.now())
  const sleep =
    options?.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)))
  const globalLimit = options?.globalPerSecond ?? 15
  const routeLimit = options?.routePerSecond ?? 8
  const globalHits: number[] = []
  const routeHits = new Map<string, number[]>()

  return {
    async acquire(route: string) {
      const hits = routeHits.get(route) ?? []
      routeHits.set(route, hits)
      for (let spin = 0; spin < MAX_SPINS; spin += 1) {
        const time = now()
        prune(globalHits, time)
        prune(hits, time)
        const wait = Math.max(
          waitFor(globalHits, time, globalLimit),
          waitFor(hits, time, routeLimit),
        )
        if (wait === 0) {
          globalHits.push(time)
          hits.push(time)
          return
        }
        await sleep(wait)
      }
      throw new Error(`Rate limiter could not acquire ${route}`)
    },
  }
}

function prune(stamps: number[], time: number) {
  while (stamps.length > 0 && (stamps[0] ?? 0) <= time - WINDOW_MS) stamps.shift()
}

function waitFor(stamps: number[], time: number, limit: number): number {
  if (stamps.length < limit) return 0
  const oldest = stamps[0] ?? time
  return Math.max(0, oldest + WINDOW_MS - time)
}
