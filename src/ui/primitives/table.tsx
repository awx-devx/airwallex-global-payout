import type { ReactNode } from 'react'

export type TableColumn<T> = {
  key: string
  header: string
  align?: 'start' | 'end'
  cell: (row: T) => ReactNode
}

type TableProps<T extends { id: string }> = {
  caption: string
  columns: readonly TableColumn<T>[]
  rows: readonly T[]
  hoverId?: string
}

export function Table<T extends { id: string }>({
  caption,
  columns,
  rows,
  hoverId,
}: TableProps<T>) {
  return (
    <table className="w-full border-collapse text-left">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="bg-[var(--bg-2)]">
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={`type-label h-10 px-4 font-[500] ${column.align === 'end' ? 'text-right' : 'text-left'}`}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.id}
            data-force={row.id === hoverId ? 'hover' : undefined}
            className="h-[52px] border-b border-[var(--line-1)] hover:bg-[var(--bg-3)] data-[force=hover]:bg-[var(--bg-3)]"
          >
            {columns.map((column) => (
              <td
                key={column.key}
                className={`px-4 ${column.align === 'end' ? 'text-right' : 'text-left'}`}
              >
                {column.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
