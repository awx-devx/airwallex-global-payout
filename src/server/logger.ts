import pino from 'pino'

const SECRET_KEYS = [
  'apiKey',
  'api_key',
  'token',
  'accessToken',
  'access_token',
  'authorization',
  'accountNumber',
  'account_number',
  'iban',
  'routingValue',
  'routing_value',
  'account_routing_value1',
  'AIRWALLEX_API_KEY',
  'AIRWALLEX_CLIENT_ID',
  'AIRWALLEX_WEBHOOK_SECRET',
] as const

function redactPaths(): string[] {
  const paths: string[] = []
  for (const key of SECRET_KEYS) {
    paths.push(key, `*.${key}`, `*.*.${key}`, `*.*.*.${key}`, `rows[*].${key}`)
  }
  paths.push(
    'headers.authorization',
    'headers["x-api-key"]',
    'headers["x-client-id"]',
    '*.headers.authorization',
    '*.headers["x-api-key"]',
    '*.headers["x-client-id"]',
    'req.headers.authorization',
    'req.headers["x-api-key"]',
    'req.headers["x-client-id"]',
    'bank_details.account_number',
    'bank_details.iban',
    'bank_details.account_routing_value1',
    '*.bank_details.account_number',
    '*.bank_details.iban',
    '*.bank_details.account_routing_value1',
    '*.*.bank_details.account_number',
    '*.*.bank_details.iban',
    '*.*.bank_details.account_routing_value1',
  )
  return paths
}

export const loggerOptions = {
  level: 'info',
  redact: {
    paths: redactPaths(),
    censor: '[Redacted]',
  },
  hooks: {
    // fast-redact mutates the object it censors. Clone first so a logged run stays intact.
    logMethod(args, method) {
      const [first, ...rest] = args
      if (typeof first === 'object' && first !== null) {
        try {
          method.apply(this, [structuredClone(first), ...rest])
          return
        } catch {
          method.apply(this, args)
          return
        }
      }
      method.apply(this, args)
    },
  },
} satisfies pino.LoggerOptions

export function createLogger(stream?: pino.DestinationStream): pino.Logger {
  return stream ? pino(loggerOptions, stream) : pino(loggerOptions)
}

export const logger = createLogger()
