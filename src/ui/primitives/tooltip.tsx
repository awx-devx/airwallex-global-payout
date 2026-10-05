'use client'

import { useState, type ReactNode } from 'react'

export function Tooltip({
  label,
  children,
  open = false,
}: {
  label: string
  children: ReactNode
  open?: boolean
}) {
  const [hover, setHover] = useState(false)
  const shown = open || hover
  return (
    <span
      className="relative inline-grid max-w-full"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <span tabIndex={0} title={label} className="block max-w-40 truncate text-[14px] leading-5">
        {children}
      </span>
      {shown ? (
        <span
          role="tooltip"
          className="absolute top-full left-0 z-10 mt-1 bg-[var(--bg-3)] px-2 py-1 text-[12px] leading-4 whitespace-nowrap text-[var(--fg-1)]"
        >
          {label}
        </span>
      ) : null}
    </span>
  )
}
