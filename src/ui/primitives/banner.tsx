import type { ReactNode } from 'react'

export type BannerTone = 'warn' | 'down' | 'info'

export function Banner({ tone, children }: { tone: BannerTone; children: ReactNode }) {
  return (
    <div
      role="status"
      className="radius-input px-4 py-3 text-[14px] leading-5 text-[var(--fg-1)]"
      style={{
        backgroundColor: `var(--${tone}-wash)`,
        boxShadow: `inset 2px 0 0 var(--${tone})`,
      }}
    >
      {children}
    </div>
  )
}
