import { defineConfig } from 'vitest/config';

// Tests que no necesitan base de datos. Los que sí la necesitan acaban en
// `.int.test.ts` y se ejecutan con vitest.integration.config.ts.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.int.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/application/**'],
      exclude: ['src/**/*.test.ts'],
      reporter: ['text-summary'],
      // RNF-11: cobertura mínima del 70 % en domain y application.
      thresholds: { lines: 70, functions: 70, branches: 70, statements: 70 },
    },
  },
});
