import { createAirwallexClientFromEnv } from '@/server/adapters/airwallex/client'
import { createAirwallexGateway } from '@/server/adapters/airwallex/gateway'
import { getServerEnv } from '@/server/env'
import type { PaymentsGateway } from '@/server/adapters/payments/gateway'
import { createMockGateway } from '@/server/adapters/payments/mock-gateway'

const globalForGateway = globalThis as typeof globalThis & {
  __payoutGateway?: PaymentsGateway
}

export function getPaymentsGateway(): PaymentsGateway {
  globalForGateway.__payoutGateway ??= createGateway()
  return globalForGateway.__payoutGateway
}

function createGateway(): PaymentsGateway {
  const env = getServerEnv()
  if (env.PAYMENTS_GATEWAY === 'mock') return createMockGateway()
  return createAirwallexGateway(createAirwallexClientFromEnv())
}
