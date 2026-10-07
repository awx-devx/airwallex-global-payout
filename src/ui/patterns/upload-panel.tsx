'use client'

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { FILE_ERROR_MESSAGES, SAMPLE_FILES, type SampleFileId } from '@/contracts'
import { FileDropzone, type DropzoneState } from '@/ui/primitives/file-dropzone'
import { focusRing } from '@/ui/primitives/button'
import { useMounted } from '@/ui/use-mounted'

export function UploadPanel({
  state = 'idle',
  message = FILE_ERROR_MESSAGES.UNSUPPORTED_FILE,
  interactive = true,
  onFile,
  onSample,
}: {
  state?: 'idle' | 'loading' | 'error'
  message?: string
  interactive?: boolean
  onFile?: (file: File) => void
  onSample?: (sampleId: SampleFileId) => void
}) {
  const dropzoneState: DropzoneState =
    state === 'loading' ? 'loading' : state === 'error' ? 'error' : 'idle'
  const loading = state === 'loading'

  return (
    <div className="grid gap-3">
      <FileDropzone
        state={dropzoneState}
        message={message}
        interactive={interactive && !loading}
        onFile={onFile}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SampleMenu loading={loading} onSample={onSample} />
        <a
          href="/samples/contractors-template.csv"
          download="contractors-template.csv"
          className={`${focusRing} w-fit text-[14px] leading-5 text-[var(--info)] underline`}
        >
          Download template
        </a>
      </div>
    </div>
  )
}

function SampleMenu({
  loading,
  onSample,
}: {
  loading: boolean
  onSample?: (sampleId: SampleFileId) => void
}) {
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const reduced = useReducedMotion() === true
  const canHover = useCanHover()

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={`${focusRing} radius-input inline-flex cursor-pointer items-center gap-2 border border-[var(--line-2)] bg-[var(--bg-2)] px-3 py-2 text-[14px] leading-5 text-[var(--fg-1)] disabled:cursor-default disabled:opacity-40`}
        aria-expanded={open}
        aria-controls={menuId}
        disabled={loading}
        onClick={() => setOpen((value) => !value)}
      >
        Sample file
        <Chevron open={open} />
      </button>
      {open ? (
        <ul
          id={menuId}
          className="radius-input absolute top-full left-0 z-30 mt-1 min-w-56 border border-[var(--line-2)] bg-[var(--bg-1)] py-1"
        >
          {SAMPLE_FILES.map((item) => (
            <SampleChoice
              key={item.id}
              label={item.label}
              href={item.href}
              fileName={item.fileName}
              reduced={reduced}
              canHover={canHover}
              onUse={() => {
                setOpen(false)
                onSample?.(item.id)
              }}
            />
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function SampleChoice({
  label,
  href,
  fileName,
  reduced,
  canHover,
  onUse,
}: {
  label: string
  href: string
  fileName: string
  reduced: boolean
  canHover: boolean
  onUse: () => void
}) {
  const [hot, setHot] = useState(false)
  return (
    <li
      className="flex items-center hover:bg-[var(--bg-3)] focus-within:bg-[var(--bg-3)]"
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      onFocusCapture={() => setHot(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHot(false)
      }}
    >
      <button
        type="button"
        className={`${focusRing} min-w-0 flex-1 cursor-pointer px-3 py-2 text-left text-[14px] leading-5 text-[var(--fg-1)]`}
        onClick={onUse}
      >
        {label}
      </button>
      <a
        href={href}
        download={fileName}
        aria-label={`Download ${label}`}
        className={`${focusRing} relative z-10 mr-1 inline-flex size-8 items-center justify-center text-[var(--fg-2)] ${hot || !canHover ? '' : 'pointer-events-none'}`}
      >
        <DownloadMark shown={hot || !canHover} reduced={reduced || !canHover} />
      </a>
    </li>
  )
}

function DownloadMark({ shown, reduced }: { shown: boolean; reduced: boolean }) {
  const mounted = useMounted()
  const icon = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2.5v7M5 7l3 3 3-3M3.5 12.5h9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
  if (!mounted) {
    return <span className="inline-flex opacity-0">{icon}</span>
  }
  return (
    <motion.span
      aria-hidden
      className="inline-flex"
      initial={false}
      animate={{ opacity: shown ? 1 : 0, x: shown || reduced ? 0 : -8 }}
      transition={{ duration: reduced ? 0 : 0.16, ease: 'easeOut' }}
    >
      {icon}
    </motion.span>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={`text-[var(--fg-2)] ${open ? 'rotate-180' : ''}`}
    >
      <path
        d="M4 6.5 8 10.5 12 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function useCanHover() {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia('(hover: hover) and (pointer: fine)')
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => window.matchMedia('(hover: hover) and (pointer: fine)').matches,
    () => true,
  )
}
