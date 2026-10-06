import { readFileSync } from 'node:fs'

export function parseEnvText(text: string): Record<string, string> {
  const entries: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    const body = trimmed.startsWith('export ') ? trimmed.slice('export '.length) : trimmed
    const separator = body.indexOf('=')
    if (separator === -1) continue
    const key = body.slice(0, separator).trim()
    if (key === '') continue
    entries[key] = parseEnvValue(body.slice(separator + 1))
  }
  return entries
}

export function loadEnvFile(file: string): void {
  const parsed = parseEnvText(readFileSync(file, 'utf8'))
  for (const [key, value] of Object.entries(parsed)) {
    process.env[key] = value
  }
}

function parseEnvValue(raw: string): string {
  const trimmed = raw.trim()
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2)
  if (quoted) return trimmed.slice(1, -1)
  const comment = trimmed.search(/\s#/)
  return (comment === -1 ? trimmed : trimmed.slice(0, comment)).trim()
}
