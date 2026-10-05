import { useId, type InputHTMLAttributes } from 'react'
import { focusRing } from './button'

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  force?: 'focus'
}

export function TextInput({
  label,
  error,
  force,
  id,
  disabled,
  className = '',
  ...props
}: TextInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`
  return (
    <div className={`grid gap-2 ${className}`}>
      <label htmlFor={inputId} className="type-label">
        {label}
      </label>
      <input
        id={inputId}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        data-force={force}
        className={`${focusRing} border bg-[var(--bg-2)] px-3 py-2 text-[14px] leading-5 text-[var(--fg-1)] outline-none disabled:cursor-default disabled:text-[var(--fg-3)] data-[force=focus]:outline data-[force=focus]:outline-1 data-[force=focus]:outline-offset-2 data-[force=focus]:outline-[var(--orange-500)] ${error ? 'border-[var(--down)]' : 'border-[var(--line-2)]'}`}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-[12px] leading-4 text-[var(--down)]">
          {error}
        </p>
      ) : null}
    </div>
  )
}
