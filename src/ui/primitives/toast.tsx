'use client'

import { motion } from 'motion/react'
import { Button } from './button'

export type ToastTone = 'info' | 'down'

type ToastProps = {
  tone: ToastTone
  message: string
  placement?: 'inline' | 'viewport'
  onClose?: () => void
}

export function Toast({ tone, message, placement = 'inline', onClose }: ToastProps) {
  const body = (
    <div
      role="status"
      className="flex items-center justify-between gap-4 border border-[var(--line-2)] bg-[var(--bg-1)] px-4 py-3"
      style={{ boxShadow: `inset 2px 0 0 var(--${tone})` }}
    >
      <p className="type-body">{message}</p>
      {onClose ? (
        <Button variant="ghost" onClick={onClose}>
          Dismiss
        </Button>
      ) : null}
    </div>
  )

  if (placement === 'inline') return body

  return (
    <motion.div
      className="fixed bottom-6 left-1/2 z-50 w-[min(24rem,calc(100%-3rem))] -translate-x-1/2"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.16 }}
    >
      {body}
    </motion.div>
  )
}
