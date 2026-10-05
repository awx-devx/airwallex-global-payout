import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { focusRing } from './button'

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  children?: ReactNode
}

export function IconButton({
  label,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      disabled={disabled}
      className={`${focusRing} inline-flex size-8 cursor-pointer items-center justify-center bg-transparent text-[var(--fg-2)] hover:bg-[var(--bg-3)] hover:text-[var(--fg-1)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--fg-2)] ${className}`}
      {...props}
    >
      {children ?? <CopyIcon />}
    </button>
  )
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="6" y="6" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 10 V3 H10" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
