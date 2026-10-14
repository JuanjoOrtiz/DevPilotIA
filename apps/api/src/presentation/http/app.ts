import express, { type Express } from 'express';
import helmet from 'helmet';
import type { CheckHealth } from '../../application/use-cases/CheckHealth.js';
import type { TokenService } from '../../domain/providers/TokenService.js';
import { createAuthController, type AuthUseCases } from '../controllers/authController.js';
import {
  createDashboardController,
  type DashboardUseCases,
} from '../controllers/dashboardController.js';
import {
  createGenerationController,
  type GenerationUseCases,
} from '../controllers/generationController.js';
import { createHealthController } from '../controllers/healthController.js';
import { createProjectController, type ProjectUseCases } from '../controllers/projectController.js';
import { createAuthentication, type PublicRoute } from './authentication.js';
import type { CookieSettings } from './cookies.js';
import { errorHandler, notFoundHandler } from './errorHandler.js';

/** Lo que necesita la capa HTTP. composition.ts lo construye y lo inyecta. */
export interface AppDependencies {
  checkHealth: CheckHealth;
  auth: AuthUseCases;
  projects: ProjectUseCases;
  generations: GenerationUseCases;
  dashboard: DashboardUseCases;
  tokens: TokenService;
  cookies: CookieSettings;
}

export const API_PREFIX = '/api/v1';
const MAX_BODY_SIZE = '100kb';

/**
 * SEG-15: las únicas rutas que no piden access token. Cualquier otra, exista o no,
 * responde 401 sin él; añadir una ruta pública es añadir una línea aquí.
 */
export const PUBLIC_ROUTES: readonly PublicRoute[] = [
  { method: 'GET', path: '/health' },
  { method: 'POST', path: '/auth/register' },
  { method: 'POST', path: '/auth/login' },
  { method: 'POST', path: '/auth/refresh' },
];

export function createApp(dependencies: AppDependencies): Express {
  const app = express();
  const auth = createAuthController(dependencies.auth, dependencies.cookies);
  const projects = createProjectController(dependencies.projects);
  const generations = createGenerationController(dependencies.generations);
  const dashboard = createDashboardController(dependencies.dashboard);

  app.disable('x-powered-by');
  app.use(helmet());
  // Ninguna respuesta, tampoco las de error, se guarda en cachés intermedias ni en el navegador.
  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: MAX_BODY_SIZE }));

  const v1 = express.Router();
  v1.use(createAuthentication(dependencies.tokens, PUBLIC_ROUTES));

  v1.get('/health', createHealthController(dependencies.checkHealth));
  v1.post('/auth/register', auth.register);
  v1.post('/auth/login', auth.login);
  v1.post('/auth/refresh', auth.refresh);
  v1.post('/auth/logout', auth.logout);
  v1.get('/auth/me', auth.me);

  v1.get('/projects', projects.list);
  v1.post('/projects', projects.create);
  v1.get('/projects/:id', projects.get);
  v1.patch('/projects/:id', projects.update);
  v1.delete('/projects/:id', projects.remove);
  v1.get('/projects/:id/generations', projects.listGenerations);
  v1.post('/projects/:id/generations', generations.create);
  v1.get('/generations/:id', generations.get);
  v1.post('/generations/:id/answers', generations.answer);
  v1.get('/generations/:id/export', generations.export);
  v1.get('/generations/:id/translation', generations.translation);

  v1.get('/dashboard/summary', dashboard.summary);

  app.use(API_PREFIX, v1);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
