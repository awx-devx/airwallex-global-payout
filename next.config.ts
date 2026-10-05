import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // This repo already has its own AGENTS.md. Don't let `next dev` append a second one.
  agentRules: false,
  // Playwright and local checks use 127.0.0.1. Next blocks that host unless it is listed.
  allowedDevOrigins: ['127.0.0.1'],
}

export default nextConfig
