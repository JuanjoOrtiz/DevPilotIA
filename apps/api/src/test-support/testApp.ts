import type { Express } from 'express';
import { CheckHealth } from '../application/use-cases/CheckHealth.js';
import { createApp } from '../presentation/http/app.js';
import { createAuthFixture } from './authFixture.js';
import { createGenerationFixture } from './generationFixture.js';
import { ScriptedLLMProvider } from './llm.js';
import { createProjectFixture } from './projectFixture.js';

interface TestAppOptions {
  /** Qué responde la base de datos al comprobar su estado. Por defecto, que está disponible. */
  databaseReachable?: () => Promise<boolean>;
  secureCookies?: boolean;
  llm?: ScriptedLLMProvider;
}

/** La aplicación HTTP completa sobre dobles en memoria: sin base de datos ni criptografía. */
export function createTestApp(options: TestAppOptions = {}) {
  const auth = createAuthFixture();
  const projects = createProjectFixture(auth.clock);
  const llm = options.llm ?? new ScriptedLLMProvider();
  const generations = createGenerationFixture({
    clock: auth.clock,
    llm,
    projects: projects.repository,
    generations: projects.generations,
  });
  const isReachable = options.databaseReachable ?? (() => Promise.resolve(true));

  const app: Express = createApp({
    checkHealth: new CheckHealth({ isReachable }, 'test'),
    auth,
    projects,
    generations,
    tokens: auth.tokens,
    cookies: { secure: options.secureCookies ?? false },
  });

  return { app, auth, projects, generations, llm };
}
