'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react'
import { useMounted } from '@/ui/use-mounted'

const ShiftContext = createContext<{ x: MotionValue<number>; y: MotionValue<number> } | null>(null)

export function Atmosphere() {
  const reduced = useReducedMotion() === true
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const x = useSpring(rawX, { stiffness: 90, damping: 16, mass: 0.45 })
  const y = useSpring(rawY, { stiffness: 90, damping: 16, mass: 0.45 })

  useEffect(() => {
    if (reduced) {
      rawX.set(0)
      rawY.set(0)
      return
    }
    const onMove = (event: PointerEvent) => {
      const nx = event.clientX / window.innerWidth - 0.5
      const ny = event.clientY / window.innerHeight - 0.5
      rawX.set(Math.max(-1, Math.min(1, nx * 2.6)))
      rawY.set(Math.max(-1, Math.min(1, ny * 2.6)))
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [reduced, rawX, rawY])

  return (
    <ShiftContext.Provider value={{ x, y }}>
      <div className="atmosphere" aria-hidden="true">
        <Piece
          place="atmosphere-left-a"
          look="atmosphere-pill atmosphere-white"
          dx={32}
          dy={20}
          drift={22}
          duration={6.5}
        />
        <Piece
          place="atmosphere-left-b"
          look="atmosphere-pill atmosphere-white"
          dx={40}
          dy={24}
          drift={28}
          duration={7.5}
        />
        <Piece
          place="atmosphere-left-c"
          look="atmosphere-pill atmosphere-purple"
          dx={16}
          dy={22}
          drift={18}
          duration={5.5}
        />
        <Piece
          place="atmosphere-arc-lime"
          look="atmosphere-arc"
          dx={48}
          dy={28}
          drift={30}
          duration={8}
        >
          <svg className="block h-full w-full" viewBox="0 0 220 360">
            <path d="M28 24 C 120 48, 36 210, 188 332" />
            <circle cx="28" cy="24" r="5" />
          </svg>
        </Piece>
        <Piece
          place="atmosphere-arc-dash"
          look="atmosphere-arc"
          dx={44}
          dy={24}
          drift={26}
          duration={6.5}
        >
          <svg className="block h-full w-full" viewBox="0 0 180 240">
            <path d="M20 16 C 40 90, 150 40, 120 220" />
            <circle cx="120" cy="220" r="4" />
          </svg>
        </Piece>
        <Piece
          place="atmosphere-right-a"
          look="atmosphere-pill atmosphere-white"
          dx={36}
          dy={20}
          drift={24}
          duration={7}
        />
        <Piece
          place="atmosphere-right-b"
          look="atmosphere-pill atmosphere-white"
          dx={44}
          dy={26}
          drift={28}
          duration={5.5}
        />
        <Piece
          place="atmosphere-right-c"
          look="atmosphere-pill atmosphere-ink"
          dx={18}
          dy={16}
          drift={20}
          duration={6.5}
        />
        <Piece
          place="atmosphere-right-d"
          look="atmosphere-pill atmosphere-lime"
          dx={16}
          dy={20}
          drift={18}
          duration={5}
        />
        <Piece
          place="atmosphere-dot"
          look="atmosphere-dot-face"
          dx={30}
          dy={26}
          drift={16}
          duration={5.5}
        />
      </div>
    </ShiftContext.Provider>
  )
}

function Piece({
  place,
  look,
  dx,
  dy,
  drift,
  duration,
  children,
}: {
  place: string
  look: string
  dx: number
  dy: number
  drift: number
  duration: number
  children?: ReactNode
}) {
  const mounted = useMounted()
  const reduced = useReducedMotion() === true
  const shift = useContext(ShiftContext)
  const stillX = useMotionValue(0)
  const stillY = useMotionValue(0)
  const x = useTransform(shift?.x ?? stillX, (value) => value * dx)
  const y = useTransform(shift?.y ?? stillY, (value) => value * dy)

  if (!mounted || reduced) {
    return (
      <span className={`atmosphere-piece ${place}`}>
        <span className={`atmosphere-look ${look}`}>{children}</span>
      </span>
    )
  }

  return (
    <motion.span className={`atmosphere-piece ${place}`} style={{ x, y }}>
      <motion.span
        className={`atmosphere-look ${look}`}
        animate={{ y: [0, -drift, 0] }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
      >
        {children}
      </motion.span>
    </motion.span>
  )
}
