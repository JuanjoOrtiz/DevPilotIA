import type { Express } from 'express';
import { CheckHealth } from '../application/use-cases/CheckHealth.js';
import { createApp } from '../presentation/http/app.js';
import { createAuthFixture } from './authFixture.js';
import { createProjectFixture } from './projectFixture.js';

interface TestAppOptions {
  /** Qué responde la base de datos al comprobar su estado. Por defecto, que está disponible. */
  databaseReachable?: () => Promise<boolean>;
  secureCookies?: boolean;
}

/** La aplicación HTTP completa sobre dobles en memoria: sin base de datos ni criptografía. */
export function createTestApp(options: TestAppOptions = {}) {
  const auth = createAuthFixture();
  const projects = createProjectFixture(auth.clock);
  const isReachable = options.databaseReachable ?? (() => Promise.resolve(true));

  const app: Express = createApp({
    checkHealth: new CheckHealth({ isReachable }, 'test'),
    auth,
    projects,
    tokens: auth.tokens,
    cookies: { secure: options.secureCookies ?? false },
  });

  return { app, auth, projects };
}
