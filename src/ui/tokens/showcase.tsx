'use client'

import { motion } from 'motion/react'
import { useSyncExternalStore } from 'react'
import { formatCountdown } from '@/ui/format/countdown'
import { formatMoney, savingsTone } from '@/ui/format/money'
import { useKitControls } from '@/ui/kit/controls'

const QUOTE_SECONDS = 58 * 60 + 12

const groups = [
  {
    title: 'Surfaces',
    swatches: [
      { name: '--bg-0', kind: 'fill' },
      { name: '--bg-1', kind: 'fill' },
      { name: '--bg-2', kind: 'fill' },
      { name: '--bg-3', kind: 'fill' },
      { name: '--line-1', kind: 'line' },
      { name: '--line-2', kind: 'line' },
      { name: '--line-3', kind: 'line' },
    ],
  },
  {
    title: 'Text',
    swatches: [
      { name: '--fg-1', kind: 'fill' },
      { name: '--fg-2', kind: 'fill' },
      { name: '--fg-3', kind: 'fill' },
      { name: '--fg-4', kind: 'fill' },
    ],
  },
  {
    title: 'Accent',
    swatches: [
      { name: '--orange-300', kind: 'fill' },
      { name: '--orange-500', kind: 'fill' },
      { name: '--orange-600', kind: 'fill' },
    ],
  },
  {
    title: 'Semantic',
    swatches: [
      { name: '--up', kind: 'fill' },
      { name: '--down', kind: 'fill' },
      { name: '--warn', kind: 'fill' },
      { name: '--info', kind: 'fill' },
      { name: '--muted', kind: 'fill' },
      { name: '--up-wash', kind: 'wash' },
      { name: '--down-wash', kind: 'wash' },
      { name: '--warn-wash', kind: 'wash' },
      { name: '--info-wash', kind: 'wash' },
      { name: '--muted-wash', kind: 'wash' },
    ],
  },
] as const

const toneClass = {
  up: 'text-[var(--up)]',
  muted: 'text-[var(--muted)]',
  only: 'text-[var(--fg-3)]',
} as const

export function TokensShowcase() {
  return (
    <div className="grid gap-8">
      {groups.map((group) => (
        <div key={group.title} className="grid gap-3">
          <h3 className="type-label">{group.title}</h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-4">
            {group.swatches.map((swatch) => (
              <Swatch key={swatch.name} name={swatch.name} kind={swatch.kind} />
            ))}
          </div>
          {group.title === 'Text' ? <ContrastPairs /> : null}
        </div>
      ))}
      <TypeRamp />
      <MoneySamples />
      <MotionSample />
    </div>
  )
}

function Swatch({ name, kind }: { name: string; kind: 'fill' | 'line' | 'wash' }) {
  const chip =
    kind === 'line' ? (
      <div className="h-12 bg-[var(--bg-1)]" style={{ boxShadow: `inset 0 0 0 1px var(${name})` }} />
    ) : (
      <div
        className="h-12 border border-[var(--line-2)]"
        style={
          kind === 'wash'
            ? {
                backgroundColor: 'var(--bg-1)',
                backgroundImage: `linear-gradient(var(${name}), var(${name}))`,
              }
            : { backgroundColor: `var(${name})` }
        }
      />
    )

  return (
    <figure>
      {chip}
      <figcaption className="type-id mt-2 text-[var(--fg-2)]">{name}</figcaption>
    </figure>
  )
}

function ContrastPairs() {
  return (
    <div className="grid gap-1">
      <p className="type-body">--fg-1 on --bg-1</p>
      <p className="type-body">--fg-2 on --bg-1</p>
    </div>
  )
}

function TypeRamp() {
  return (
    <div className="grid gap-3">
      <h3 className="type-label">Type</h3>
      <p className="type-title">Screen title</p>
      <p className="type-section">Section</p>
      <p className="type-body">Body copy for a contractor row.</p>
      <p className="type-label">Label</p>
      <p className="type-money">{formatMoney('USD', '18960.00')}</p>
      <p className="type-id">B-run_ready</p>
    </div>
  )
}

function MoneySamples() {
  const { now, frozenAt } = useKitControls()
  const pinned = new Date(Date.parse(frozenAt) + QUOTE_SECONDS * 1000).toISOString()
  const savings = [
    savingsTone('15.00', 'USD'),
    savingsTone('0.00', 'USD'),
    savingsTone(null, 'USD'),
  ]
  const figures = [
    formatMoney('USD', '4200.00'),
    formatMoney('INR', '185000.00'),
    formatMoney('JPY', '240000'),
    formatMoney('BHD', '1.234'),
    formatMoney('USD', '0.00', { signed: true }),
    formatMoney('USD', null),
  ]

  return (
    <div className="grid gap-3">
      <h3 className="type-label">Money</h3>
      <p className="flex flex-wrap gap-x-6 gap-y-2">
        {figures.map((figure) => (
          <span key={figure} className="nums type-body">
            {figure}
          </span>
        ))}
      </p>
      <p className="flex flex-wrap gap-x-6 gap-y-2">
        {savings.map((item) => (
          <span key={item.text} className={`nums type-body ${toneClass[item.tone]}`}>
            {item.text}
          </span>
        ))}
      </p>
      <p className="flex flex-wrap gap-x-6 gap-y-2">
        <span className="nums type-body">{formatCountdown(shift(now, QUOTE_SECONDS), now)}</span>
        <span className="nums type-body">{formatCountdown(shift(now, 45), now)}</span>
        <span className="nums type-body">{formatCountdown(now.toISOString(), now)}</span>
        <span className="nums type-body" data-testid="kit-countdown">
          {formatCountdown(pinned, now)}
        </span>
      </p>
    </div>
  )
}

function MotionSample() {
  const { reducedMotion } = useKitControls()
  const prefersReduced = useSyncExternalStore(
    subscribeReducedMotion,
    readReducedMotion,
    () => false,
  )
  const still = reducedMotion || prefersReduced

  return (
    <div className="grid max-w-sm gap-3">
      <h3 className="type-label">Motion</h3>
      <div className="shimmer h-8" data-testid="kit-shimmer" />
      <div
        className="relative h-8 bg-[var(--bg-1)]"
        data-testid="kit-marker"
        data-marker={still ? 'end' : 'start'}
      >
        <motion.div
          className="absolute bottom-0 h-0.5 w-1/2 bg-[var(--orange-500)]"
          initial={{ x: still ? '100%' : '0%' }}
          animate={{ x: '100%' }}
          transition={{ duration: still ? 0 : 0.22, ease: 'easeOut' }}
        />
      </div>
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <motion.path
          key={still ? 'still' : 'draw'}
          d="M5 12.5 L10 17.5 L19 7.5"
          fill="transparent"
          stroke="var(--up)"
          strokeWidth="2"
          strokeLinecap="square"
          initial={{ pathLength: still ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: still ? 0 : 0.2, ease: 'easeOut' }}
          data-testid="kit-check"
          data-drawn={still ? 'true' : 'false'}
        />
      </svg>
    </div>
  )
}

function subscribeReducedMotion(onChange: () => void): () => void {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function readReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function shift(now: Date, seconds: number): string {
  return new Date(now.getTime() + seconds * 1000).toISOString()
}
