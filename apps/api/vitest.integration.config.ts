import { defineConfig } from 'vitest/config';

// En local, DATABASE_URL sale del .env de la raíz; en el CI llega del entorno.
try {
  process.loadEnvFile('../../.env');
} catch {
  // Sin .env no hay nada que cargar.
}

// Tests contra un PostgreSQL real. Necesitan DATABASE_URL y las migraciones aplicadas.
export default defineConfig({
  test: {
    include: ['src/**/*.int.test.ts'],
    fileParallelism: false,
  },
});
