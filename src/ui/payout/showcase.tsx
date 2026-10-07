'use client'

import { useEffect, useState } from 'react'
import { RowStatusSchema } from '@/contracts'
import { useKitControls } from '@/ui/kit/controls'
import { BalancePill } from './balance-pill'
import { ContractorRows } from './contractor-row'
import { CostSummary } from './cost-summary'
import { FieldErrors } from './field-errors'
import { Money } from './money'
import { ProcessStepper, usePrefersReducedMotion } from './process-stepper'
import { QuoteCountdown } from './quote-countdown'
import { PayBar } from './pay-bar'
import { RailChip } from './rail-chip'
import { Savings } from './savings'
import {
  balance,
  cleanCost,
  discardedRun,
  expiredFlag,
  expiredQuote,
  paidRun,
  payBars,
  pricingProgress,
  priyaErrors,
  readyExpired,
  readyQuote,
  readyRows,
  reviewProgress,
  runBadgeRuns,
  samErrors,
  stateRows,
  stepperSamples,
} from './showcase.fixtures'
import { StatusBadge } from './status-badge'

export function PayoutShowcase() {
  const { width, now, reducedMotion } = useKitControls()
  const orientation = width === 800 ? 'vertical' : 'horizontal'

  return (
    <div className="grid gap-10">
      <section className="grid gap-3">
        <h3 className="type-label">Money</h3>
        <div className="flex flex-wrap items-baseline gap-6">
          <Money currency="USD" value="4200.00" />
          <Money currency="USD" value="15.00" signed />
          <Money currency="USD" value="0.00" signed />
          <Money currency="JPY" value="240000" />
          <Money currency="BHD" value="1.234" />
          <Money currency="USD" value={null} />
          <Money currency="USD" value="189.60" size="bar" />
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="type-label">Rail</h3>
        <div className="flex flex-wrap items-center gap-6">
          <RailChip railLabel="ACH" chosen />
          <span className="type-body text-[var(--fg-3)]">instead of SWIFT</span>
          <RailChip railLabel="SWIFT" chosen={false} />
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="type-label">Savings</h3>
        <div className="flex flex-wrap items-baseline gap-6">
          <Savings savings="15.00" currency="USD" />
          <Savings savings="0.00" currency="USD" />
          <Savings savings={null} currency="USD" />
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="type-label">Row status</h3>
        <div className="flex flex-wrap gap-2">
          {RowStatusSchema.options.map((status) => (
            <StatusBadge key={status} kind="row" status={status} />
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="type-label">Run status</h3>
        <div className="flex flex-wrap gap-2">
          {runBadgeRuns.map((run) => (
            <StatusBadge
              key={run.id}
              kind="run"
              status={run.status}
              airwallexStatus={run.airwallexStatus}
              quoteExpired={run.quoteExpired}
              rows={run.rows}
            />
          ))}
          <StatusBadge kind="run" {...paidRun} />
          <StatusBadge kind="run" {...discardedRun} />
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="type-label">Field errors</h3>
        <FieldErrors errors={samErrors} />
        <FieldErrors errors={priyaErrors} />
      </section>

      <section className="grid gap-3">
        <h3 className="type-label">Quote</h3>
        <div className="grid max-w-md gap-3">
          <div data-testid="payout-countdown">
            <QuoteCountdown expiresAt={readyQuote.expiresAt} expired={readyExpired} now={now} />
          </div>
          <div data-testid="payout-countdown-expired">
            <QuoteCountdown expiresAt={expiredQuote.expiresAt} expired={expiredFlag} now={now} />
          </div>
        </div>
      </section>

      <section className="grid max-w-md gap-3">
        <h3 className="type-label">Balance</h3>
        <BalancePill balance={balance} />
        <h3 className="type-label">Cost</h3>
        <CostSummary
          payerPays={cleanCost.payerPays}
          fee={cleanCost.fee}
          savings={cleanCost.savings}
          sourceCurrency={cleanCost.sourceCurrency}
        />
      </section>

      <section className="grid gap-3">
        <h3 className="type-label">Desktop</h3>
        <ContractorRows rows={readyRows} layout="row" />
      </section>

      <section className="grid gap-3">
        <h3 className="type-label">Row states</h3>
        <ContractorRows rows={stateRows} layout="row" />
      </section>

      <section className="grid gap-6">
        <h3 className="type-label">Pay bar</h3>
        {payBars.map((run) => (
          <div key={run.id} className="grid gap-2" data-testid={`paybar-${run.id}`}>
            <h4 className="type-label">{run.id}</h4>
            <PayBar
              includedCount={run.includedCount}
              totalPayerPays={run.totalPayerPays}
              sourceCurrency={run.sourceCurrency}
              allowedActions={run.allowedActions}
              flags={run.flags}
              balance={run.balance}
            />
          </div>
        ))}
      </section>

      <section className="grid gap-6">
        <h3 className="type-label">Price to Review</h3>
        <PriceToReviewStory orientation={orientation} still={reducedMotion} />
        {stepperSamples.map((sample) => (
          <div key={sample.id} className="grid gap-2">
            <h4 className="type-label">{sample.label}</h4>
            <ProcessStepper
              progress={sample.progress}
              orientation={orientation}
              still={reducedMotion}
            />
          </div>
        ))}
      </section>
    </div>
  )
}

function PriceToReviewStory({
  orientation,
  still,
}: {
  orientation: 'horizontal' | 'vertical'
  still: boolean
}) {
  const { clockFrozen } = useKitControls()
  const prefersReduced = usePrefersReducedMotion()
  const jump = clockFrozen || still || prefersReduced
  const [atReview, setAtReview] = useState(false)

  useEffect(() => {
    if (jump || atReview) return
    const id = window.setTimeout(() => setAtReview(true), 480)
    return () => window.clearTimeout(id)
  }, [jump, atReview])

  return (
    <ProcessStepper
      progress={jump || atReview ? reviewProgress : pricingProgress}
      orientation={orientation}
      testId="payout-story-stepper"
      detailTestId="payout-story"
      still={still || prefersReduced}
    />
  )
}
