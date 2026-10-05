import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

export default function DevLayout({ children }: { children: ReactNode }) {
  if (process.env.DEMO_MODE !== 'true') notFound()
  return children
}
