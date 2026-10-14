import type { Express } from 'express';
import { SampleProjectProvisioner } from '../application/services/SampleProjectProvisioner.js';
import { SessionIssuer } from '../application/services/SessionIssuer.js';
import { CheckHealth } from '../application/use-cases/CheckHealth.js';
import { RegisterUser } from '../application/use-cases/RegisterUser.js';
import { GetDashboardSummary } from '../application/use-cases/GetDashboardSummary.js';
import { createApp } from '../presentation/http/app.js';
import { createAuthFixture } from './authFixture.js';
import { InMemoryDashboardRepository } from './fakes.js';
import { createGenerationFixture } from './generationFixture.js';
import { ScriptedLLMProvider } from './llm.js';
import { createProjectFixture } from './projectFixture.js';

interface TestAppOptions {
  /** Qué responde la base de datos al comprobar su estado. Por defecto, que está disponible. */
  databaseReachable?: () => Promise<boolean>;
  secureCookies?: boolean;
  llm?: ScriptedLLMProvider;
  /** Cada cuenta nueva recibe el proyecto de ejemplo, como en producción (RF-PRO-06). */
  sampleProjects?: boolean;
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
    auth: options.sampleProjects
      ? {
          ...auth,
          registerUser: new RegisterUser(
            auth.users,
            auth.hasher,
            new SessionIssuer(auth.tokens, auth.refreshTokens),
            new SampleProjectProvisioner(projects.repository, projects.generations, auth.clock),
          ),
        }
      : auth,
    projects,
    generations,
    dashboard: {
      getDashboardSummary: new GetDashboardSummary(
        new InMemoryDashboardRepository(projects.repository, projects.generations),
        auth.clock,
      ),
    },
    tokens: auth.tokens,
    cookies: { secure: options.secureCookies ?? false },
  });

  return { app, auth, projects, generations, llm };
}
