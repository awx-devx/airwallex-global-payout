import type { FieldError } from '@/contracts'

/** The message already names the column. The path stays off the line. */
export function FieldErrors({ errors }: { errors: readonly FieldError[] }) {
  if (errors.length === 0) return null
  return (
    <ul className="grid gap-1">
      {errors.map((error) => (
        <li key={`${error.path}:${error.message}`} className="type-body text-[var(--down)]">
          {error.message}
        </li>
      ))}
    </ul>
  )
}
