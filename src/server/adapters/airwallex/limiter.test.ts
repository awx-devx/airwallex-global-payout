import { describe, expect, it } from 'vitest'
import { createRateLimiter, retryDelayMs } from '@/server/adapters/airwallex/limiter'

describe('rate limiter', () => {
  it('waits once a route has used 8 requests in the window', async () => {
    let now = 0
    const waits: number[] = []
    const limiter = createRateLimiter({
      now: () => now,
      sleep: async (ms) => {
        waits.push(ms)
        now += ms
      },
      globalPerSecond: 15,
      routePerSecond: 8,
    })

    for (let index = 0; index < 8; index += 1) await limiter.acquire('POST /items')
    await limiter.acquire('POST /items')

    expect(waits).toEqual([1_000])
  })

  it('waits on the 16th request across routes', async () => {
    let now = 0
    const waits: number[] = []
    const limiter = createRateLimiter({
      now: () => now,
      sleep: async (ms) => {
        waits.push(ms)
        now += ms
      },
      globalPerSecond: 15,
      routePerSecond: 8,
    })

    for (let index = 0; index < 15; index += 1) await limiter.acquire(`GET /route-${index}`)
    await limiter.acquire('GET /route-15')

    expect(waits).toEqual([1_000])
  })

  it('backs off without a new delay formula per failure', () => {
    expect(retryDelayMs(0, () => 0)).toBe(200)
    expect(retryDelayMs(1, () => 0)).toBe(400)
    expect(retryDelayMs(2, () => 0)).toBe(800)
  })
})
