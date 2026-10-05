export const qk = {
  runs: ['runs'] as const,
  run: (id: string) => ['runs', id] as const,
  balance: ['balance'] as const,
}
