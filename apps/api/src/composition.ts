// Punto de composición: el único fichero que importa de todas las capas.
// Crea las implementaciones de infrastructure y las inyecta en los casos de uso.
// No arranca nada: de eso se encargan main.ts (servidor) e index.ts (Vercel).
import type { Express } from 'express';
import { CheckHealth } from './application/use-cases/CheckHealth.js';
import type { Env } from './infrastructure/config/env.js';
import { PrismaDatabaseHealthProbe } from './infrastructure/database/PrismaDatabaseHealthProbe.js';
import {
  createDatabase,
  type Database,
  type DatabasePoolOptions,
} from './infrastructure/database/prismaClient.js';
import { createApp } from './presentation/http/app.js';

export interface CompositionOptions {
  databasePool?: DatabasePoolOptions;
}

export interface Composition {
  app: Express;
  database: Database;
}

export function compose(env: Env, options: CompositionOptions = {}): Composition {
  const database = createDatabase(env.DATABASE_URL, options.databasePool);

  const app = createApp({
    checkHealth: new CheckHealth(new PrismaDatabaseHealthProbe(database.prisma), env.APP_VERSION),
  });

  return { app, database };
}
