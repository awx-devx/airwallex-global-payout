import { runProgress } from '@/contracts'
import {
  balanceOk,
  runApproval,
  runDone,
  runInflight,
  runPricing,
  runReady,
  runReadyClean,
} from '@/mocks/fixtures'

export const headerBalance = balanceOk

export const listRuns = [runInflight, runDone] as const

export const reviews = [
  { id: 'run_pricing', title: 'Pricing', run: runPricing, progress: runProgress(runPricing) },
  { id: 'run_ready', title: 'Review', run: runReady, progress: runProgress(runReady) },
  {
    id: 'run_ready_clean',
    title: 'Review, ready to pay',
    run: runReadyClean,
    progress: runProgress(runReadyClean),
  },
  {
    id: 'run_inflight',
    title: 'Pay, booking',
    run: runInflight,
    progress: runProgress(runInflight),
  },
  {
    id: 'run_approval',
    title: 'Pay, approval',
    run: runApproval,
    progress: runProgress(runApproval),
  },
  { id: 'run_done', title: 'Done, failures', run: runDone, progress: runProgress(runDone) },
] as const
