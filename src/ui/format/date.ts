const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

/** Absolute date for a run list, such as `2 Apr 2026`. */
export function formatRunDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const month = MONTHS[date.getUTCMonth()]
  if (!month) return '—'
  return `${date.getUTCDate()} ${month} ${date.getUTCFullYear()}`
}
