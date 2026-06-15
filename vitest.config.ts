import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude],
    coverage: {
      provider: 'v8',
      include: ['**/*.js'],
      thresholds: {
        statements: 94,
        branches: 80,
        functions: 88,
        lines: 94,
      },
    },
  },
})
