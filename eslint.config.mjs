import nextConfig from 'eslint-config-next'
import prettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

const serverAndFeatures = [
  '@/server',
  '@/server/**',
  '@/features',
  '@/features/**',
  '**/server/**',
  '**/features/**',
]

const mocks = ['@/mocks', '@/mocks/**', '**/mocks/**']

export default defineConfig([
  ...nextConfig,
  prettier,
  globalIgnores(['coverage', 'playwright-report', 'test-results', 'blob-report']),
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    ignores: ['src/ui/**/*.fixtures.ts', 'src/ui/**/*.fixtures.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@tanstack/react-query',
              message: 'src/ui is props-only and does not fetch.',
            },
          ],
          patterns: [
            {
              group: serverAndFeatures,
              message: 'src/ui cannot import server or features.',
            },
            {
              group: mocks,
              message: 'src/ui cannot import mocks. A showcase *.fixtures.ts file may.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/ui/**/*.fixtures.ts', 'src/ui/**/*.fixtures.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: serverAndFeatures,
              message: 'Showcase fixtures cannot import server or features.',
            },
          ],
        },
      ],
    },
  },
])
