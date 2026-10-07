import { z } from 'zod'

const mongodbUri = /^mongodb(\+srv)?:\/\//

function blankToUndefined(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

function optionalText() {
  return z.preprocess(blankToUndefined, z.string().min(1).optional())
}

function textDefault(fallback: string) {
  return z.preprocess(blankToUndefined, z.string().min(1).default(fallback))
}

function enumDefault<const T extends readonly [string, ...string[]]>(
  values: T,
  fallback: T[number],
) {
  return z.preprocess(blankToUndefined, z.enum(values).default(fallback))
}

const ServerEnvSchema = z
  .object({
    MONGODB_URI: z.preprocess(
      blankToUndefined,
      z
        .string({ required_error: 'MONGODB_URI is required' })
        .min(1, 'MONGODB_URI is required')
        .regex(mongodbUri, 'MONGODB_URI must be a mongodb URI'),
    ),
    SOURCE_CURRENCY: textDefault('USD'),
    DEMO_MODE: enumDefault(['true', 'false'], 'false'),
    NEXT_PUBLIC_DATA_SOURCE: enumDefault(['mock', 'api'], 'mock'),
    PAYMENTS_GATEWAY: enumDefault(['mock', 'airwallex'], 'mock'),
    AIRWALLEX_ENV: enumDefault(['sandbox', 'production'], 'sandbox'),
    AIRWALLEX_BASE_URL: z.preprocess(
      blankToUndefined,
      z.string().url().default('https://api.sandbox.airwallex.com'),
    ),
    AIRWALLEX_API_VERSION: textDefault('2026-08-21'),
    AIRWALLEX_CLIENT_ID: optionalText(),
    AIRWALLEX_API_KEY: optionalText(),
    AIRWALLEX_WEBHOOK_SECRET: optionalText(),
  })
  .superRefine((env, ctx) => {
    if (env.PAYMENTS_GATEWAY !== 'airwallex') return
    if (!env.AIRWALLEX_CLIENT_ID) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AIRWALLEX_CLIENT_ID'],
        message: 'AIRWALLEX_CLIENT_ID is required when PAYMENTS_GATEWAY is airwallex',
      })
    }
    if (!env.AIRWALLEX_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AIRWALLEX_API_KEY'],
        message: 'AIRWALLEX_API_KEY is required when PAYMENTS_GATEWAY is airwallex',
      })
    }
  })

export type ServerEnv = z.infer<typeof ServerEnvSchema>

let cached: ServerEnv | undefined

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const parsed = ServerEnvSchema.safeParse(source)
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'env'
        return `${path}: ${issue.message}`
      })
      .join('; ')
    throw new Error(`Invalid server environment. ${details}`)
  }
  return parsed.data
}

export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env)
  return cached
}

export function clearServerEnvCache(): void {
  cached = undefined
}
