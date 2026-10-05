'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type KitWidth = 800 | 1120

type KitControls = {
  reducedMotion: boolean
  clockFrozen: boolean
  frozenAt: string
  now: Date
  width: KitWidth
}

const KitControlsContext = createContext<KitControls | null>(null)

export function KitControlsProvider({
  reducedMotion,
  clockFrozen,
  frozenAt,
  width,
  children,
}: {
  reducedMotion: boolean
  clockFrozen: boolean
  frozenAt: string
  width: KitWidth
  children: ReactNode
}) {
  const [liveNow, setLiveNow] = useState(() => new Date())

  useEffect(() => {
    if (clockFrozen) return
    const id = window.setInterval(() => setLiveNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [clockFrozen])

  const now = clockFrozen ? new Date(frozenAt) : liveNow

  return (
    <KitControlsContext.Provider value={{ reducedMotion, clockFrozen, frozenAt, now, width }}>
      {children}
    </KitControlsContext.Provider>
  )
}

export function useKitControls(): KitControls {
  const value = useContext(KitControlsContext)
  if (!value) throw new Error('Kit controls are only available on the UI kit page')
  return value
}
