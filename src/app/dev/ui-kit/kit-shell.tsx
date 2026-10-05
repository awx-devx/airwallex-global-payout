'use client'

import { MotionConfig } from 'motion/react'
import { useState } from 'react'
import type { KitSectionId } from '@/ui/kit/sections'

export type KitWidth = 800 | 1120

type Section = { id: KitSectionId; title: string }

type KitShellProps = {
  sections: readonly Section[]
  frozenAt: string
  initialMotion: 'on' | 'off'
  initialClock: 'live' | 'frozen'
  initialWidth: KitWidth
}

const controlClass =
  'cursor-pointer border border-[var(--line-2)] bg-[var(--bg-2)] px-3 py-2 text-[12px] leading-4 font-[500] tracking-[0.02em] text-[var(--fg-1)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--orange-500)] aria-pressed:border-[var(--orange-500)] aria-pressed:text-[var(--orange-300)]'

export function KitShell({
  sections,
  frozenAt,
  initialMotion,
  initialClock,
  initialWidth,
}: KitShellProps) {
  const [motion, setMotion] = useState(initialMotion)
  const [clock, setClock] = useState(initialClock)
  const [width, setWidth] = useState<KitWidth>(initialWidth)
  const reduced = motion === 'off'

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
      <div className="min-h-screen bg-[var(--bg-0)] text-[var(--fg-1)]" data-motion={motion}>
        <header className="flex items-center justify-between gap-6 border-b border-[var(--line-1)] bg-[var(--bg-1)] px-6 py-4">
          <h1 className="text-[20px] leading-7 [font-weight:560]">UI kit</h1>
          <div className="flex items-center gap-2" role="toolbar" aria-label="Kit toolbar">
            <button
              type="button"
              className={controlClass}
              aria-pressed={reduced}
              onClick={() => setMotion(reduced ? 'on' : 'off')}
            >
              Reduced motion
            </button>
            <button
              type="button"
              className={controlClass}
              aria-pressed={clock === 'frozen'}
              onClick={() => setClock(clock === 'frozen' ? 'live' : 'frozen')}
            >
              Freeze clock
            </button>
            <button
              type="button"
              className={`${controlClass} font-mono`}
              aria-pressed={width === 800}
              onClick={() => setWidth(800)}
            >
              800
            </button>
            <button
              type="button"
              className={`${controlClass} font-mono`}
              aria-pressed={width === 1120}
              onClick={() => setWidth(1120)}
            >
              1120
            </button>
          </div>
        </header>
        <div className="flex min-h-[calc(100vh-65px)]">
          <nav
            aria-label="Kit sections"
            className="w-52 shrink-0 border-r border-[var(--line-1)] bg-[var(--bg-1)] px-4 py-6"
          >
            <ul className="grid gap-2">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="block text-[14px] leading-5 text-[var(--fg-2)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--orange-500)]"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="min-w-0 flex-1 px-6 py-6">
            <div
              data-kit-stage
              data-motion={motion}
              data-clock={clock}
              data-width={width}
              data-frozen-at={clock === 'frozen' ? frozenAt : undefined}
              className="mx-auto"
              style={{ width }}
            >
              {sections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-6 border-b border-[var(--line-1)] py-8"
                >
                  <h2 className="text-[14px] leading-5 [font-weight:560]">{section.title}</h2>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MotionConfig>
  )
}
