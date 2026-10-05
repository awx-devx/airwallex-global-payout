'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type KitControls = {
  reducedMotion: boolean
  clockFrozen: boolean
  frozenAt: string
  now: Date
}

const KitControlsContext = createContext<KitControls | null>(null)

export function KitControlsProvider({
  reducedMotion,
  clockFrozen,
  frozenAt,
  children,
}: {
  reducedMotion: boolean
  clockFrozen: boolean
  frozenAt: string
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
    <KitControlsContext.Provider value={{ reducedMotion, clockFrozen, frozenAt, now }}>
      {children}
    </KitControlsContext.Provider>
  )
}

export function useKitControls(): KitControls {
  const value = useContext(KitControlsContext)
  if (!value) throw new Error('Kit controls are only available on the UI kit page')
  return value
}
