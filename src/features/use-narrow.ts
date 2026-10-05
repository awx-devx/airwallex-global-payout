'use client'

import { useSyncExternalStore } from 'react'

export function useNarrow(): boolean {
  return useSyncExternalStore(subscribeNarrow, readNarrow, () => false)
}

function subscribeNarrow(onChange: () => void): () => void {
  const media = window.matchMedia('(max-width: 799px)')
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function readNarrow(): boolean {
  return window.matchMedia('(max-width: 799px)').matches
}
