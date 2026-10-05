import type { ReactNode } from 'react'

export type BadgeTone = 'up' | 'down' | 'warn' | 'info' | 'muted'

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span
      className="radius-pill inline-flex px-2 py-1 text-[12px] leading-4 font-[500] tracking-[0.02em]"
      style={{ color: `var(--${tone})`, backgroundColor: `var(--${tone}-wash)` }}
    >
      {children}
    </span>
  )
}
