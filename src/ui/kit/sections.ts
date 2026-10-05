export const kitSections = [
  { id: 'tokens', title: 'Tokens' },
  { id: 'primitives', title: 'Primitives' },
  { id: 'payout', title: 'Payout' },
  { id: 'patterns', title: 'Patterns' },
] as const

export type KitSectionId = (typeof kitSections)[number]['id']
