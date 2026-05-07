import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude],
    coverage: {
      provider: 'v8',
      all: true,
      include: ['**/*.js'],
      thresholds: {
        lines: 94,
        functions: 90,
        branches: 78,
        statements: 94,
      },
    },
  },
})
