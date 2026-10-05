import type { ReactNode } from 'react'

export function EmptyState({ title, action }: { title: string; action: ReactNode }) {
  return (
    <div className="radius-sheet grid justify-items-center gap-4 border border-[var(--line-1)] bg-[var(--bg-1)] px-6 py-12 text-center">
      <p className="type-title">{title}</p>
      {action}
    </div>
  )
}
