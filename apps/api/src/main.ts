// Punto de composición: el único fichero que importa de todas las capas.
// Crea las implementaciones de infrastructure, las inyecta en los casos de uso y arranca.
import { CheckHealth } from './application/use-cases/CheckHealth.js';
import { InvalidEnvError, loadEnv, type Env } from './infrastructure/config/env.js';
import { PrismaDatabaseHealthProbe } from './infrastructure/database/PrismaDatabaseHealthProbe.js';
import { createPrismaClient } from './infrastructure/database/prismaClient.js';
import { createApp } from './presentation/http/app.js';

function readEnvOrExit(): Env {
  try {
    return loadEnv();
  } catch (error) {
    if (error instanceof InvalidEnvError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

const env = readEnvOrExit();
const prisma = createPrismaClient(env.DATABASE_URL);

const app = createApp({
  checkHealth: new CheckHealth(new PrismaDatabaseHealthProbe(prisma), env.APP_VERSION),
});

const server = app.listen(env.PORT, () => {
  console.log(`DevPilot API listening on port ${env.PORT} (${env.NODE_ENV})`);
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
