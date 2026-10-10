import { defineConfig } from 'vitest/config';

// Tests contra un PostgreSQL real. Necesitan DATABASE_URL y las migraciones aplicadas.
export default defineConfig({
  test: {
    include: ['src/**/*.int.test.ts'],
    fileParallelism: false,
  },
});
