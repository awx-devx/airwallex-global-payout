type EnvSource = Record<string, string | undefined>

export function advanceRouteEnabled(env: EnvSource = process.env): boolean {
  return env.DEMO_MODE === 'true' || env.AIRWALLEX_ENV === 'sandbox'
}
