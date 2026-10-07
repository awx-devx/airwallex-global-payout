import { settled } from '@/contracts'
import type { RowStatus, RunStatus } from '@/contracts'
import type { BadgeTone } from '@/ui/primitives/badge'

export const rowBadges: Record<RowStatus, { label: string; tone: BadgeTone }> = {
  invalid: { label: 'Invalid', tone: 'down' },
  pricing: { label: 'Pricing', tone: 'muted' },
  ready: { label: 'Ready', tone: 'info' },
  needs_fix: { label: 'Needs fix', tone: 'warn' },
  excluded: { label: 'Excluded', tone: 'muted' },
  booking: { label: 'Booking', tone: 'info' },
  booked: { label: 'Booked', tone: 'info' },
  booking_failed: { label: 'Booking failed', tone: 'down' },
  processing: { label: 'Processing', tone: 'info' },
  sent: { label: 'Sent', tone: 'info' },
  paid: { label: 'Paid', tone: 'up' },
  failed: { label: 'Failed', tone: 'down' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
}

export type RunBadgeInput = {
  status: RunStatus
  airwallexStatus: string | null
  quoteExpired: boolean
  rows: readonly { status: RowStatus }[]
}

export function runBadge(run: RunBadgeInput): { label: string; tone: BadgeTone } {
  if (run.status === 'PRICING') return { label: 'Pricing', tone: 'muted' }
  if (run.status === 'READY' && run.quoteExpired) return { label: 'Quote expired', tone: 'warn' }
  if (run.status === 'READY') return { label: 'Ready to pay', tone: 'info' }
  if (run.status === 'SUBMITTED' && run.airwallexStatus === 'IN_APPROVAL') {
    return { label: 'Waiting for approval', tone: 'warn' }
  }
  if (run.status === 'SUBMITTED' && !settled(run)) return { label: 'Paying', tone: 'info' }
  if (run.status === 'SUBMITTED' && settled(run)) {
    const included = run.rows.filter((row) => row.status !== 'excluded')
    const everyPaid = included.length > 0 && included.every((row) => row.status === 'paid')
    if (everyPaid) return { label: 'Paid', tone: 'up' }
    if (included.length > 0 && included.every((row) => row.status === 'cancelled')) {
      return { label: 'Cancelled', tone: 'muted' }
    }
    const failed = included.some(
      (row) =>
        row.status === 'failed' || row.status === 'booking_failed' || row.status === 'cancelled',
    )
    if (failed) return { label: 'Paid with failures', tone: 'warn' }
  }
  if (run.status === 'FAILED') return { label: 'Failed', tone: 'down' }
  return { label: 'Discarded', tone: 'muted' }
}
