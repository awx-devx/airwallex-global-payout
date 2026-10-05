const SECOND = 1000

export function formatCountdown(iso: string, now: Date = new Date()): string {
  const ends = Date.parse(iso)
  const start = now.getTime()
  if (!Number.isFinite(ends) || !Number.isFinite(start)) return 'Expired'
  const remaining = ends - start
  if (remaining < SECOND) return 'Expired'
  const totalSeconds = Math.floor(remaining / SECOND)
  if (totalSeconds < 60) return `${totalSeconds}s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
