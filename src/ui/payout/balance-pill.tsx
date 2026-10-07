'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { parseMoney, type Balance } from '@/contracts'
import { formatMoney } from '@/ui/format/money'

export function BalancePill({ balance, className = '' }: { balance: Balance; className?: string }) {
  const reduced = useReducedMotion() === true
  const drop = useBalanceDrop(balance, reduced)
  return (
    <motion.span
      className={`radius-pill nums inline-flex border border-[var(--line-2)] bg-[var(--bg-1)] px-3 py-2 text-[14px] leading-5 whitespace-nowrap text-[var(--fg-1)] ${className}`}
      initial={false}
      animate={{
        color: drop ? 'var(--down)' : 'var(--fg-1)',
        backgroundColor: drop ? 'var(--down-wash)' : 'var(--bg-1)',
      }}
      transition={{ duration: reduced ? 0 : 0.18, ease: 'easeOut' }}
    >
      {balance.currency} available {amountOnly(balance.currency, balance.available)}
    </motion.span>
  )
}

function useBalanceDrop(balance: Balance, reduced: boolean): boolean {
  const { available, currency } = balance
  const seen = useRef({ available, currency })
  const [drop, setDrop] = useState(false)

  useEffect(() => {
    const previous = seen.current
    seen.current = { available, currency }
    if (previous.currency !== currency) return
    if (!parseMoney(available).lt(parseMoney(previous.available))) return
    if (reduced) return
    setDrop(true)
    const timer = window.setTimeout(() => setDrop(false), 280)
    return () => window.clearTimeout(timer)
  }, [available, currency, reduced])

  return drop
}

function amountOnly(currency: string, value: string): string {
  const formatted = formatMoney(currency, value)
  const prefix = `${currency} `
  return formatted.startsWith(prefix) ? formatted.slice(prefix.length) : formatted
}
