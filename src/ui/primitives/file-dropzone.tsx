'use client'

import { useState, type DragEvent } from 'react'
import { motion, useReducedMotion } from 'motion/react'
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
  const reduced = useReducedMotion() === true
  const [over, setOver] = useState(false)
  const [pointer, setPointer] = useState(false)
  const visual: DropzoneState = state === 'idle' && over ? 'drag' : state
  const busy = visual === 'loading'
  const hot = visual === 'drag'
  const border =
    visual === 'error'
      ? 'border-[var(--down)] bg-[var(--down-wash)]'
      : hot
        ? 'border-[var(--purple)] bg-[var(--info-wash)]'
        : 'border-[color-mix(in_srgb,var(--fg-1)_32%,transparent)] hover:border-[var(--purple)] hover:bg-[var(--info-wash)]'

  function allowDrop(event: DragEvent<HTMLLabelElement>) {
    if (!interactive || busy) return
    event.preventDefault()
    setOver(true)
  }

  function takeFile(file: File | undefined) {
    if (!file || busy) return
    onFile?.(file)
  }

  const body = <DropBody visual={visual} message={message} active={hot || pointer} />
  const shell = `group/drop radius-sheet flex min-h-40 flex-col items-center justify-center border-2 border-dashed bg-[var(--bg-1)] px-6 py-10 text-center transition-colors duration-150 ${border}`

  if (!interactive) {
    return (
      <div aria-hidden="true" className={shell}>
        {body}
      </div>
    )
  }

  return (
    <motion.label
      className={`${focusRing} cursor-pointer ${shell} ${busy ? 'pointer-events-none' : ''}`}
      animate={{ scale: hot && !reduced ? 1.012 : 1 }}
      transition={{ duration: reduced ? 0 : 0.16, ease: 'easeOut' }}
      onMouseEnter={() => setPointer(true)}
      onMouseLeave={() => setPointer(false)}
      onFocusCapture={() => setPointer(true)}
      onBlurCapture={() => setPointer(false)}
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
    </motion.label>
  )
}

function DropBody({
  visual,
  message,
  active,
}: {
  visual: DropzoneState
  message: string
  active: boolean
}) {
  return (
    <span className="grid w-full justify-items-center gap-3">
      <DropMark active={active || visual === 'drag'} />
      <span className="type-body">Drop a contractor CSV</span>
      {visual === 'loading' ? <span className="shimmer block h-2 w-full max-w-xs" /> : null}
      {visual === 'error' ? (
        <span className="max-w-md text-[14px] leading-5 text-[var(--down)]">{message}</span>
      ) : null}
    </span>
  )
}

function DropMark({ active }: { active: boolean }) {
  const reduced = useReducedMotion() === true
  const bob = active && !reduced
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden
      className={
        active ? 'text-[var(--info)]' : 'text-[var(--fg-3)] group-hover/drop:text-[var(--info)]'
      }
    >
      <motion.g
        initial={false}
        animate={bob ? { y: [0, 8, 0] } : { y: active ? 8 : 0 }}
        transition={
          bob
            ? { duration: 0.85, repeat: Infinity, ease: 'easeInOut' }
            : { duration: reduced ? 0 : 0.2, ease: 'easeOut' }
        }
      >
        <path
          d="M22 7v16M15 17l7 7 7-7"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.g>
      <path d="M11 37h22" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}
