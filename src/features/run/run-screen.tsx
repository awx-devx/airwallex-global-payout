'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ContractError, runProgress } from '@/contracts'
import { formatMoney } from '@/ui/format/money'
import {
  useAdvance,
  useBalance,
  useDiscard,
  useExcludeRow,
  usePay,
  useRequote,
  useRun,
} from '@/features/data/hooks'
import { sourceNow } from '@/features/data/source'
import { useNarrow } from '@/features/use-narrow'
import { CostSummary } from '@/ui/payout/cost-summary'
import { PayBar } from '@/ui/payout/pay-bar'
import { ProcessStepper } from '@/ui/payout/process-stepper'
import { QuoteCountdown } from '@/ui/payout/quote-countdown'
import { StatusBadge } from '@/ui/payout/status-badge'
import { AppHeader } from '@/ui/patterns/app-header'
import { ReviewTable } from '@/ui/patterns/review-table'
import { Banner } from '@/ui/primitives/banner'
import { Dialog } from '@/ui/primitives/dialog'
import { EmptyState } from '@/ui/primitives/empty-state'
import { SkeletonRows } from '@/ui/primitives/skeleton'
import { Toast } from '@/ui/primitives/toast'
import { focusRing } from '@/ui/primitives/button'
import { runBanner } from './banner'
import { payFailure } from './pay-error'

export function RunScreen({ id }: { id: string }) {
  const router = useRouter()
  const narrow = useNarrow()
  const runQuery = useRun(id)
  const balance = useBalance()
  const pay = usePay(id)
  const discard = useDiscard(id)
  const exclude = useExcludeRow(id)
  const requote = useRequote(id)
  const advance = useAdvance(id)
  const [payOpen, setPayOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const run = runQuery.data
  const balanceState = balance.isError ? 'error' : balance.data ? 'ready' : 'loading'
  const orientation = narrow ? 'vertical' : 'horizontal'

  async function confirmPay() {
    try {
      const next = await pay.mutateAsync()
      setPayOpen(false)
      router.replace(`/runs/${next.id}`)
    } catch (error) {
      const failure = payFailure(error)
      if (failure === 'refetch') {
        setPayOpen(false)
        void runQuery.refetch()
        return
      }
      if (failure === 'toast' && error instanceof ContractError) {
        setPayOpen(false)
        setToast(error.message)
      }
    }
  }

  async function confirmDiscard() {
    await discard.mutateAsync()
    setDiscardOpen(false)
    router.push('/')
  }

  if (runQuery.isError) {
    const missing = runQuery.error instanceof ContractError && runQuery.error.code === 'NOT_FOUND'
    return (
      <main className="mx-auto grid min-h-screen w-full min-w-0 max-w-[1120px] content-start bg-[var(--bg-0)] px-4 pt-2 min-[800px]:px-6">
        <AppHeader balance={balance.data ?? null} balanceState={balanceState} backHref="/" />
        {missing ? (
          <EmptyState
            title="This payout does not exist"
            action={
              <Link href="/" className={`${focusRing} type-body text-[var(--info)]`}>
                Payouts
              </Link>
            }
          />
        ) : (
          <Banner tone="down">
            {runQuery.error instanceof Error ? runQuery.error.message : 'Something went wrong.'}
          </Banner>
        )}
      </main>
    )
  }

  const banner = run ? runBanner(run) : null
  const payLabel = run
    ? `Pay ${run.includedCount} contractors · ${formatMoney(run.sourceCurrency, run.totalPayerPays)}`
    : 'Pay'

  return (
    <main className="mx-auto grid min-h-screen w-full min-w-0 max-w-[1120px] content-start gap-6 bg-[var(--bg-0)] px-4 pt-2 pb-16 min-[800px]:px-6">
      <AppHeader balance={balance.data ?? null} balanceState={balanceState} backHref="/" />
      {run ? (
        <>
          <div className="flex w-full min-w-0 flex-wrap items-center gap-3">
            <h1 className="type-title min-w-0 truncate" title={run.fileName}>
              {run.fileName}
            </h1>
            <StatusBadge
              kind="run"
              status={run.status}
              airwallexStatus={run.airwallexStatus}
              quoteExpired={run.quoteExpired}
              rows={run.rows}
            />
          </div>
          <ProcessStepper
            progress={runProgress(run)}
            orientation={orientation}
            detailTestId="run-step-detail"
          />
          {banner ? <Banner tone={banner.tone}>{banner.message}</Banner> : null}
          {run.status === 'PRICING' ? null : (
            <CostSummary
              payerPays={run.totalPayerPays}
              fee={run.quote?.feeAmount ?? null}
              savings={run.totalSavings}
              sourceCurrency={run.sourceCurrency}
            />
          )}
          {run.quote ? (
            <QuoteCountdown
              expiresAt={run.quote.expiresAt}
              expired={run.quoteExpired}
              now={sourceNow()}
            />
          ) : null}
          {run.status === 'PRICING' ? (
            <SkeletonRows count={run.rowCount > 0 ? run.rowCount : 6} />
          ) : (
            <ReviewTable
              rows={run.rows}
              layout="row"
              onExclude={(rowId) => void exclude.mutateAsync(rowId)}
            />
          )}
          {run.allowedActions.some((action) => action !== 'exclude') ? (
            <PayBar
              includedCount={run.includedCount}
              totalPayerPays={run.totalPayerPays}
              sourceCurrency={run.sourceCurrency}
              allowedActions={run.allowedActions}
              flags={run.flags}
              balance={run.balance}
              onAction={(action) => {
                if (action === 'pay') setPayOpen(true)
                if (action === 'discard') setDiscardOpen(true)
                if (action === 'requote') void requote.mutateAsync()
                if (action === 'advance') void advance.mutateAsync()
              }}
            />
          ) : null}
          {run.includedCount === 0 && run.status !== 'PRICING' ? (
            <p className="type-body text-[var(--fg-2)]">Nothing to pay.</p>
          ) : null}
          <Dialog
            open={payOpen}
            title="Confirm pay"
            description={`${payLabel} from the ${run.sourceCurrency} wallet?`}
            confirmLabel={payLabel}
            onConfirm={() => void confirmPay()}
            onClose={() => setPayOpen(false)}
          />
          <Dialog
            open={discardOpen}
            tone="danger"
            title="Discard this draft?"
            description="Nothing has been paid."
            confirmLabel="Discard draft"
            onConfirm={() => void confirmDiscard()}
            onClose={() => setDiscardOpen(false)}
          />
        </>
      ) : (
        <SkeletonRows count={6} />
      )}
      {toast ? (
        <Toast tone="down" message={toast} placement="viewport" onClose={() => setToast(null)} />
      ) : null}
    </main>
  )
}
