'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './button'

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

type DialogProps = {
  open: boolean
  title: string
  description?: ReactNode
  tone?: 'default' | 'danger'
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onClose: () => void
  placement?: 'modal' | 'inline'
}

export function Dialog({
  open,
  title,
  description,
  tone = 'default',
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
  placement = 'modal',
}: DialogProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open || placement !== 'modal') return
    const panel = panelRef.current
    if (!panel) return
    const previous = document.activeElement
    const nodes = () => [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)]
    nodes().at(-1)?.focus()

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const list = nodes()
      const first = list[0]
      const last = list.at(-1)
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [open, placement])

  const panel = (
    <div
      ref={panelRef}
      role={placement === 'modal' ? 'dialog' : 'group'}
      aria-modal={placement === 'modal' ? true : undefined}
      aria-labelledby={titleId}
      className="w-full max-w-md border border-[var(--line-2)] bg-[var(--bg-1)] p-6"
    >
      <h3 id={titleId} className="type-section">
        {title}
      </h3>
      {description ? <p className="type-body mt-3 text-[var(--fg-2)]">{description}</p> : null}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  )

  if (placement === 'inline') return open ? panel : null

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="dialog"
          className="fixed inset-0 z-40 flex items-center justify-center bg-[color-mix(in_srgb,var(--bg-0)_72%,transparent)] px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.16 }}
            onClick={(event) => event.stopPropagation()}
          >
            {panel}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
