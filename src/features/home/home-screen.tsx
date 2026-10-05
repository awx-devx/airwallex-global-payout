'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ContractError, FILE_ERROR_CODES } from '@/contracts'
import { useBalance, useCreateRun, useRuns } from '@/features/data/hooks'
import { AppHeader } from '@/ui/patterns/app-header'
import { RunList } from '@/ui/patterns/run-list'
import { UploadPanel } from '@/ui/patterns/upload-panel'

export function HomeScreen() {
  const router = useRouter()
  const runs = useRuns()
  const balance = useBalance()
  const createRun = useCreateRun()
  const [fileError, setFileError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function upload(file: File) {
    setBusy(true)
    setFileError(null)
    try {
      const run = await createRun.mutateAsync(file)
      router.push(`/runs/${run.id}`)
    } catch (error) {
      setFileError(messageFor(error))
    } finally {
      setBusy(false)
    }
  }

  async function uploadSample() {
    setBusy(true)
    setFileError(null)
    try {
      const response = await fetch('/samples/contractors.csv')
      if (!response.ok) throw new Error('Upload a CSV with the contractor header.')
      const blob = await response.blob()
      const run = await createRun.mutateAsync(
        new File([blob], 'contractors.csv', { type: 'text/csv' }),
      )
      router.push(`/runs/${run.id}`)
    } catch (error) {
      setFileError(messageFor(error))
    } finally {
      setBusy(false)
    }
  }

  const balanceState = balance.isError ? 'error' : balance.data ? 'ready' : 'loading'

  return (
    <main className="mx-auto grid min-h-screen w-full min-w-0 max-w-[1120px] content-start gap-8 bg-[var(--bg-0)] px-4 pt-2 pb-16 min-[800px]:px-6">
      <AppHeader balance={balance.data ?? null} balanceState={balanceState} />
      <UploadPanel
        state={busy ? 'loading' : fileError ? 'error' : 'idle'}
        message={fileError ?? undefined}
        onFile={(file) => void upload(file)}
        onSample={() => void uploadSample()}
      />
      <RunList
        runs={runs.data ?? []}
        state={runs.data ? (runs.data.length === 0 ? 'empty' : 'ready') : 'loading'}
      />
    </main>
  )
}

function messageFor(error: unknown): string {
  if (
    error instanceof ContractError &&
    (FILE_ERROR_CODES as readonly string[]).includes(error.code)
  ) {
    return error.message
  }
  if (error instanceof Error && error.message) return error.message
  return 'Upload a CSV with the contractor header.'
}
