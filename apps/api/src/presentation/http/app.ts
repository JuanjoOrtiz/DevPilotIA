import express, { type Express } from 'express';
import helmet from 'helmet';
import type { CheckHealth } from '../../application/use-cases/CheckHealth.js';
import { createHealthController } from '../controllers/healthController.js';
import { errorHandler, notFoundHandler } from './errorHandler.js';

/** Casos de uso que necesita la capa HTTP. main.ts los construye y los inyecta. */
export interface AppDependencies {
  checkHealth: CheckHealth;
}

export const API_PREFIX = '/api/v1';
const MAX_BODY_SIZE = '100kb';

export function createApp(dependencies: AppDependencies): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: MAX_BODY_SIZE }));

  const v1 = express.Router();
  // Ninguna respuesta de la API se guarda en cachés intermedias ni en el navegador.
  v1.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  v1.get('/health', createHealthController(dependencies.checkHealth));
  app.use(API_PREFIX, v1);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
