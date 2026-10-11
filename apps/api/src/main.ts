// Arranque como servidor: desarrollo, Docker y cualquier hosting de contenedores.
// En Vercel no se usa este fichero, sino index.ts.
import { compose } from './composition.js';
import { InvalidEnvError, loadEnv, type Env } from './infrastructure/config/env.js';

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
const { app, database } = compose(env);

const server = app.listen(env.PORT, () => {
  console.log(`DevPilot API listening on port ${env.PORT} (${env.NODE_ENV})`);
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    void database.prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
