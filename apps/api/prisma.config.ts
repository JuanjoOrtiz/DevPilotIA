import { defineConfig } from 'prisma/config';

// En local las variables salen del .env de la raíz; en Docker y en el CI llegan del entorno.
try {
  process.loadEnvFile('../../.env');
} catch {
  // Sin .env no hay nada que cargar.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
