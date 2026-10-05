import type { Metadata } from 'next'
import { JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import type { ReactNode } from 'react'
import { QueryProvider } from '@/features/data/provider'
import { Atmosphere } from './atmosphere'
import { MotionRoot } from './motion-root'
import './globals.css'

const grotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-grotesk',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
})

export const metadata: Metadata = {
  title: 'Global payout',
  icons: { icon: '/assets/favicon.png' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${grotesk.variable} ${jetbrains.variable}`}>
      <body>
        <Atmosphere />
        <div className="app-frame">
          <MotionRoot>
            <QueryProvider>{children}</QueryProvider>
          </MotionRoot>
        </div>
      </body>
    </html>
  )
}
