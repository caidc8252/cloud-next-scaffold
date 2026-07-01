import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/fixtures/**'],
    testTimeout: 10000,
  },
})
