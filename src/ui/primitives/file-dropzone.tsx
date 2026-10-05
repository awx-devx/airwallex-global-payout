'use client'

import { useState, type DragEvent } from 'react'
import { FILE_ERROR_MESSAGES } from '@/contracts'
import { focusRing } from './button'

export type DropzoneState = 'idle' | 'drag' | 'loading' | 'error'

type FileDropzoneProps = {
  state?: DropzoneState
  message?: string
  interactive?: boolean
  onFile?: (file: File) => void
}

export function FileDropzone({
  state = 'idle',
  message = FILE_ERROR_MESSAGES.UNSUPPORTED_FILE,
  interactive = true,
  onFile,
}: FileDropzoneProps) {
  const [over, setOver] = useState(false)
  const visual: DropzoneState = state === 'idle' && over ? 'drag' : state
  const busy = visual === 'loading'
  const border =
    visual === 'error'
      ? 'border-[var(--down)]'
      : visual === 'drag'
        ? 'border-[var(--purple)] bg-[var(--bg-3)]'
        : 'border-[var(--line-2)]'

  function allowDrop(event: DragEvent<HTMLLabelElement>) {
    if (!interactive || busy) return
    event.preventDefault()
    setOver(true)
  }

  function takeFile(file: File | undefined) {
    if (!file || busy) return
    onFile?.(file)
  }

  const body = (
    <>
      <span className="type-body">Drop a contractor CSV</span>
      {visual === 'loading' ? <span className="shimmer mt-4 block h-2 w-full" /> : null}
      {visual === 'error' ? (
        <span className="mt-2 block text-[14px] leading-5 text-[var(--down)]">{message}</span>
      ) : null}
    </>
  )

  if (!interactive) {
    return (
      <div aria-hidden="true" className={`radius-sheet border bg-[var(--bg-1)] px-6 py-8 ${border}`}>
        {body}
      </div>
    )
  }

  return (
    <label
      className={`${focusRing} radius-sheet block cursor-pointer border bg-[var(--bg-1)] px-6 py-8 ${border} ${busy ? 'pointer-events-none' : ''}`}
      onDragOver={allowDrop}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        if (busy) return
        event.preventDefault()
        setOver(false)
        takeFile(event.dataTransfer.files[0])
      }}
    >
      <input
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        disabled={busy}
        aria-busy={busy || undefined}
        onChange={(event) => takeFile(event.target.files?.[0])}
      />
      {body}
    </label>
  )
}
