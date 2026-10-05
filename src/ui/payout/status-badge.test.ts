import { describe, expect, it } from 'vitest'
import { RowStatusSchema } from '@/contracts'
import { rowBadges, runBadge } from './status-map'

describe('rowBadges', () => {
  it('covers every row status', () => {
    expect(Object.keys(rowBadges).sort()).toEqual([...RowStatusSchema.options].sort())
    expect(rowBadges.invalid).toEqual({ label: 'Invalid', tone: 'down' })
    expect(rowBadges.needs_fix).toEqual({ label: 'Needs fix', tone: 'warn' })
    expect(rowBadges.paid).toEqual({ label: 'Paid', tone: 'up' })
    expect(rowBadges.booking_failed).toEqual({ label: 'Booking failed', tone: 'down' })
    expect(rowBadges.cancelled).toEqual({ label: 'Cancelled', tone: 'muted' })
  })
})

describe('runBadge', () => {
  const rows = (status: 'paid' | 'failed' | 'processing' | 'booking_failed') => [{ status }]

  it('maps every run condition', () => {
    expect(
      runBadge({ status: 'PRICING', airwallexStatus: null, quoteExpired: false, rows: [] }),
    ).toEqual({ label: 'Pricing', tone: 'muted' })
    expect(
      runBadge({ status: 'READY', airwallexStatus: 'DRAFTING', quoteExpired: true, rows: [] }),
    ).toEqual({ label: 'Quote expired', tone: 'warn' })
    expect(
      runBadge({ status: 'READY', airwallexStatus: 'DRAFTING', quoteExpired: false, rows: [] }),
    ).toEqual({ label: 'Ready to pay', tone: 'info' })
    expect(
      runBadge({
        status: 'SUBMITTED',
        airwallexStatus: 'IN_APPROVAL',
        quoteExpired: false,
        rows: rows('processing'),
      }),
    ).toEqual({ label: 'Waiting for approval', tone: 'warn' })
    expect(
      runBadge({
        status: 'SUBMITTED',
        airwallexStatus: 'BOOKING',
        quoteExpired: false,
        rows: rows('processing'),
      }),
    ).toEqual({ label: 'Paying', tone: 'info' })
    expect(
      runBadge({
        status: 'SUBMITTED',
        airwallexStatus: 'BOOKED',
        quoteExpired: false,
        rows: rows('paid'),
      }),
    ).toEqual({ label: 'Paid', tone: 'up' })
    expect(
      runBadge({
        status: 'SUBMITTED',
        airwallexStatus: 'BOOKED',
        quoteExpired: false,
        rows: [{ status: 'paid' }, { status: 'failed' }],
      }),
    ).toEqual({ label: 'Paid with failures', tone: 'warn' })
    expect(
      runBadge({
        status: 'SUBMITTED',
        airwallexStatus: 'BOOKED',
        quoteExpired: false,
        rows: rows('booking_failed'),
      }),
    ).toEqual({ label: 'Paid with failures', tone: 'warn' })
    expect(
      runBadge({ status: 'FAILED', airwallexStatus: 'FAILED', quoteExpired: false, rows: [] }),
    ).toEqual({ label: 'Failed', tone: 'down' })
    expect(
      runBadge({ status: 'DISCARDED', airwallexStatus: null, quoteExpired: false, rows: [] }),
    ).toEqual({ label: 'Discarded', tone: 'muted' })
  })
})
