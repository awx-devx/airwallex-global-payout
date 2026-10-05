import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonForce = 'hover' | 'pressed'

const focusRing =
  'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--orange-500)]'

const variantClass: Record<ButtonVariant, string> = {
  primary: [
    'bg-[var(--orange-500)] text-[var(--bg-0)]',
    'hover:bg-[var(--orange-600)]',
    'active:bg-[color-mix(in_srgb,var(--orange-600)_82%,black)]',
    'data-[force=hover]:bg-[var(--orange-600)]',
    'data-[force=pressed]:bg-[color-mix(in_srgb,var(--orange-600)_82%,black)]',
  ].join(' '),
  secondary: [
    'border border-[var(--line-2)] bg-[var(--bg-2)] text-[var(--fg-1)]',
    'hover:bg-[var(--bg-3)]',
    'active:border-[var(--line-3)] active:bg-[var(--bg-3)]',
    'data-[force=hover]:bg-[var(--bg-3)]',
    'data-[force=pressed]:border-[var(--line-3)] data-[force=pressed]:bg-[var(--bg-3)]',
  ].join(' '),
  danger: [
    'bg-[var(--down)] text-[var(--bg-0)]',
    'hover:bg-[color-mix(in_srgb,var(--down)_88%,white)]',
    'active:bg-[color-mix(in_srgb,var(--down)_82%,black)]',
    'data-[force=hover]:bg-[color-mix(in_srgb,var(--down)_88%,white)]',
    'data-[force=pressed]:bg-[color-mix(in_srgb,var(--down)_82%,black)]',
  ].join(' '),
  ghost: [
    'bg-transparent text-[var(--fg-2)]',
    'hover:bg-[var(--bg-3)] hover:text-[var(--fg-1)]',
    'active:bg-[var(--bg-2)] active:text-[var(--fg-1)]',
    'data-[force=hover]:bg-[var(--bg-3)] data-[force=hover]:text-[var(--fg-1)]',
    'data-[force=pressed]:bg-[var(--bg-2)] data-[force=pressed]:text-[var(--fg-1)]',
  ].join(' '),
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  loading?: boolean
  force?: ButtonForce
  children: ReactNode
}

export function Button({
  variant = 'primary',
  loading = false,
  force,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const inactive = Boolean(disabled || loading)
  return (
    <button
      type={type}
      disabled={inactive}
      aria-busy={loading || undefined}
      data-force={inactive ? undefined : force}
      className={`${focusRing} inline-flex w-fit cursor-pointer items-center justify-center gap-2 px-4 py-2 text-[14px] leading-5 font-[500] whitespace-nowrap disabled:cursor-default disabled:opacity-40 ${variantClass[variant]} ${className}`}
      {...props}
    >
      {children}
      {loading ? <span aria-hidden="true">…</span> : null}
    </button>
  )
}

export { focusRing }
