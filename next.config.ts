import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // This repo already has its own AGENTS.md. Don't let `next dev` append a second one.
  agentRules: false,
  // Playwright uses 127.0.0.1. Replit’s preview iframe uses a replit.dev host.
  // Next blocks those hosts unless they are listed.
  allowedDevOrigins: ['127.0.0.1', '*.replit.dev', '*.replit.app', '*.repl.co'],
}

export default nextConfig
