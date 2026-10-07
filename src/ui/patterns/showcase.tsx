'use client'

import { useState } from 'react'
import { FILE_ERROR_MESSAGES } from '@/contracts'
import { useKitControls } from '@/ui/kit/controls'
import { CostSummary } from '@/ui/payout/cost-summary'
import { PayBar } from '@/ui/payout/pay-bar'
import { ProcessStepper } from '@/ui/payout/process-stepper'
import { QuoteCountdown } from '@/ui/payout/quote-countdown'
import { StatusBadge } from '@/ui/payout/status-badge'
import { AppHeader } from './app-header'
import { ReviewTable } from './review-table'
import { RunList } from './run-list'
import { headerBalance, listRuns, reviews } from './showcase.fixtures'
import { UploadPanel } from './upload-panel'
import type { RunProgress } from '@/contracts'
import type { RunDetail } from '@/contracts'

export function PatternsShowcase() {
  const { width, now, reducedMotion } = useKitControls()
  const orientation = width === 800 ? 'vertical' : 'horizontal'
  const [sampleFile, setSampleFile] = useState<string | null>(null)

  return (
    <div className="grid gap-10">
      <section className="grid gap-6">
        <h3 className="type-label">Header</h3>
        <AppHeader balance={headerBalance} />
        <AppHeader balance={null} balanceState="loading" />
        <AppHeader balance={null} balanceState="error" />
        <AppHeader balance={headerBalance} backHref="/" />
      </section>

      <section className="grid gap-6">
        <h3 className="type-label">Upload</h3>
        <UploadPanel
          onFile={(file) => setSampleFile(file.name)}
          onSample={(sampleId) => setSampleFile(sampleId)}
        />
        {sampleFile ? <p className="type-body text-[var(--fg-2)]">{sampleFile}</p> : null}
        <UploadPanel state="loading" interactive={false} />
        <UploadPanel
          state="error"
          message={FILE_ERROR_MESSAGES.UNSUPPORTED_FILE}
          interactive={false}
        />
        <UploadPanel
          state="error"
          message={FILE_ERROR_MESSAGES.TOO_MANY_ROWS}
          interactive={false}
        />
      </section>

      <section className="grid gap-6">
        <h3 className="type-label">Run list</h3>
        <RunList runs={[]} state="empty" />
        <RunList runs={listRuns} />
        <RunList runs={[]} state="loading" />
      </section>

      <section className="grid gap-10">
        <h3 className="type-label">Review</h3>
        {reviews.map((sample) => (
          <ReviewAssembly
            key={sample.id}
            sample={sample}
            orientation={orientation}
            still={reducedMotion}
            now={now}
          />
        ))}
      </section>
    </div>
  )
}

function ReviewAssembly({
  sample,
  orientation,
  still,
  now,
}: {
  sample: { id: string; title: string; run: RunDetail; progress: RunProgress }
  orientation: 'horizontal' | 'vertical'
  still: boolean
  now: Date
}) {
  const { run, progress } = sample
  return (
    <div className="grid gap-4" data-testid={`pattern-${sample.id}`}>
      <h4 className="type-label">{sample.title}</h4>
      <div className="flex flex-wrap items-center gap-3">
        <p className="type-section">{run.fileName}</p>
        <StatusBadge
          kind="run"
          status={run.status}
          airwallexStatus={run.airwallexStatus}
          quoteExpired={run.quoteExpired}
          rows={run.rows}
        />
      </div>
      <ProcessStepper progress={progress} orientation={orientation} still={still} />
      {run.status === 'PRICING' ? null : (
        <CostSummary
          payerPays={run.totalPayerPays}
          fee={run.quote?.feeAmount ?? null}
          savings={run.totalSavings}
          sourceCurrency={run.sourceCurrency}
        />
      )}
      {run.status === 'READY' && run.quote ? (
        <QuoteCountdown expiresAt={run.quote.expiresAt} expired={run.quoteExpired} now={now} />
      ) : null}
      <ReviewTable rows={run.rows} layout="row" />
      <PayBar
        includedCount={run.includedCount}
        totalPayerPays={run.totalPayerPays}
        sourceCurrency={run.sourceCurrency}
        allowedActions={run.allowedActions}
        flags={run.flags}
        balance={run.balance}
      />
    </div>
  )
}
