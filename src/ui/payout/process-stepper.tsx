'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useId, useSyncExternalStore } from 'react'
import type { RunProgress, StepState } from '@/contracts'

const checkPath = 'M3.5 8.5 L6.5 11.5 L12.5 4.5'
const crossPath = 'M4.5 4.5 L11.5 11.5 M11.5 4.5 L4.5 11.5'

export function ProcessStepper({
  progress,
  orientation,
  testId,
  detailTestId,
  still: stillProp = false,
}: {
  progress: RunProgress
  orientation: 'horizontal' | 'vertical'
  testId?: string
  detailTestId?: string
  still?: boolean
}) {
  const prefersReduced = usePrefersReducedMotion()
  const still = stillProp || prefersReduced
  const markerId = useId()
  const detail = progress.steps.find((step) => step.detail)?.detail ?? null
  const current = progress.steps.find((step) => step.id === progress.currentId)
  const failed = current?.state === 'failed'

  return (
    <div data-testid={testId}>
      <ol className={orientation === 'horizontal' ? 'grid grid-cols-5' : 'grid'}>
        {progress.steps.map((step) => {
          const currentStep = step.id === progress.currentId
          return (
            <li
              key={step.id}
              aria-current={currentStep ? 'step' : undefined}
              className={`relative ${orientation === 'horizontal' ? 'px-2 pt-1 pb-3' : 'py-2 pl-4'}`}
            >
              <div className="flex items-center gap-2">
                <StepMark state={step.state} still={still} />
                <span className={labelClass(step.state)}>{step.label}</span>
              </div>
              {currentStep ? (
                <motion.span
                  layoutId={markerId}
                  className={
                    orientation === 'horizontal'
                      ? 'absolute right-2 bottom-0 left-2 h-0.5'
                      : 'absolute top-0 bottom-0 left-0 w-0.5'
                  }
                  style={{ backgroundColor: failed ? 'var(--down)' : 'var(--orange-500)' }}
                  transition={{ duration: still ? 0 : 0.22, ease: 'easeOut' }}
                />
              ) : null}
            </li>
          )
        })}
      </ol>
      <Detail text={detail} still={still} testId={detailTestId} />
    </div>
  )
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, readReducedMotion, () => false)
}

function Detail({ text, still, testId }: { text: string | null; still: boolean; testId?: string }) {
  return (
    <div className="grid min-h-5 pt-2">
      <AnimatePresence initial={false}>
        {text ? (
          <motion.p
            key={text}
            data-testid={testId}
            className="type-body col-start-1 row-start-1 text-[var(--fg-2)]"
            initial={{ opacity: still ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: still ? 0 : 0.16 }}
          >
            {text}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function StepMark({ state, still }: { state: StepState; still: boolean }) {
  if (state === 'upcoming' || state === 'current') {
    return <span className="inline-block size-4 shrink-0" />
  }
  const failed = state === 'failed'
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      className={`shrink-0 ${failed ? 'text-[var(--down)]' : 'text-[var(--up)]'}`}
    >
      <motion.path
        d={failed ? crossPath : checkPath}
        fill="transparent"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
        initial={{ pathLength: still ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: still ? 0 : 0.2, ease: 'easeOut' }}
      />
    </svg>
  )
}

function labelClass(state: StepState): string {
  if (state === 'failed') return 'type-body text-[var(--down)]'
  if (state === 'upcoming') return 'type-body text-[var(--fg-4)]'
  if (state === 'current') return 'type-section text-[var(--fg-1)]'
  return 'type-body text-[var(--fg-1)]'
}

function subscribeReducedMotion(onChange: () => void): () => void {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function readReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
