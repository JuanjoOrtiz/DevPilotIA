// Punto de composición: el único fichero que importa de todas las capas.
// Crea las implementaciones de infrastructure y las inyecta en los casos de uso.
// No arranca nada: de eso se encargan main.ts (servidor) e index.ts (Vercel).
import type { Express } from 'express';
import { SessionIssuer } from './application/services/SessionIssuer.js';
import { GenerationRunner } from './application/services/GenerationRunner.js';
import { AnswerClarification } from './application/use-cases/AnswerClarification.js';
import { CheckHealth } from './application/use-cases/CheckHealth.js';
import { CreateGeneration } from './application/use-cases/CreateGeneration.js';
import { CreateProject } from './application/use-cases/CreateProject.js';
import { DeleteProject } from './application/use-cases/DeleteProject.js';
import { GetCurrentUser } from './application/use-cases/GetCurrentUser.js';
import { GetGeneration } from './application/use-cases/GetGeneration.js';
import { GetProject } from './application/use-cases/GetProject.js';
import { ListProjectGenerations } from './application/use-cases/ListProjectGenerations.js';
import { ListProjects } from './application/use-cases/ListProjects.js';
import { LoginUser } from './application/use-cases/LoginUser.js';
import { LogoutUser } from './application/use-cases/LogoutUser.js';
import { RefreshSession } from './application/use-cases/RefreshSession.js';
import { RegisterUser } from './application/use-cases/RegisterUser.js';
import { UpdateProject } from './application/use-cases/UpdateProject.js';
import type { BackgroundTasks } from './domain/providers/BackgroundTasks.js';
import type { LLMProvider } from './domain/providers/LLMProvider.js';
import type { PasswordHasher } from './domain/providers/PasswordHasher.js';
import { FakeLLMProvider } from './infrastructure/ai/FakeLLMProvider.js';
import { GeminiProvider } from './infrastructure/ai/GeminiProvider.js';
import type { Env } from './infrastructure/config/env.js';
import { PrismaDatabaseHealthProbe } from './infrastructure/database/PrismaDatabaseHealthProbe.js';
import { PrismaGenerationRepository } from './infrastructure/database/PrismaGenerationRepository.js';
import { PrismaProjectRepository } from './infrastructure/database/PrismaProjectRepository.js';
import { PrismaRefreshTokenRepository } from './infrastructure/database/PrismaRefreshTokenRepository.js';
import { PrismaUserRepository } from './infrastructure/database/PrismaUserRepository.js';
import {
  createDatabase,
  type Database,
  type DatabasePoolOptions,
} from './infrastructure/database/prismaClient.js';
import { BcryptPasswordHasher } from './infrastructure/security/BcryptPasswordHasher.js';
import { JoseTokenService } from './infrastructure/security/JoseTokenService.js';
import { SystemClock } from './infrastructure/security/SystemClock.js';
import { WaitUntilBackgroundTasks } from './infrastructure/runtime/WaitUntilBackgroundTasks.js';
import { createApp } from './presentation/http/app.js';

export interface CompositionOptions {
  databasePool?: DatabasePoolOptions;
  /** Los tests inyectan uno más rápido; por defecto, bcrypt con su coste de producción. */
  passwordHasher?: PasswordHasher;
  /** Los tests inyectan un modelo con respuestas fijas; por defecto, el que diga LLM_PROVIDER. */
  llm?: LLMProvider;
  background?: BackgroundTasks;
}

/** El modelo de lenguaje que pide la configuración. loadEnv ya exige la clave para Gemini. */
function createLLMProvider(env: Env): LLMProvider {
  if (env.LLM_PROVIDER === 'gemini' && env.GEMINI_API_KEY) {
    return new GeminiProvider({
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
      maxOutputTokens: env.LLM_MAX_OUTPUT_TOKENS,
    });
  }
  return new FakeLLMProvider({ latencyMs: env.FAKE_LLM_LATENCY_MS });
}

export interface Composition {
  app: Express;
  database: Database;
}

export function compose(env: Env, options: CompositionOptions = {}): Composition {
  const database = createDatabase(env.DATABASE_URL, options.databasePool);
  const { prisma } = database;

  const clock = new SystemClock();
  const users = new PrismaUserRepository(prisma);
  const refreshTokens = new PrismaRefreshTokenRepository(prisma);
  const projects = new PrismaProjectRepository(prisma);
  const generations = new PrismaGenerationRepository(prisma);
  const hasher = options.passwordHasher ?? new BcryptPasswordHasher();
  const tokens = new JoseTokenService(
    { accessSecret: env.JWT_ACCESS_SECRET, refreshSecret: env.JWT_REFRESH_SECRET },
    clock,
  );
  const sessions = new SessionIssuer(tokens, refreshTokens);
  const background = options.background ?? new WaitUntilBackgroundTasks();
  const runner = new GenerationRunner({
    llm: options.llm ?? createLLMProvider(env),
    generations,
    clock,
    timeouts: { attemptMs: env.LLM_ATTEMPT_TIMEOUT_MS, totalMs: env.GENERATION_TIMEOUT_MS },
    wait: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
    reportFailure: (failure) => console.warn('Generation failed', failure),
  });

  const app = createApp({
    checkHealth: new CheckHealth(new PrismaDatabaseHealthProbe(prisma), env.APP_VERSION),
    auth: {
      registerUser: new RegisterUser(users, hasher, sessions),
      loginUser: new LoginUser(users, hasher, sessions),
      refreshSession: new RefreshSession({ users, refreshTokens, tokens, sessions, clock }),
      logoutUser: new LogoutUser(refreshTokens, tokens, clock),
      getCurrentUser: new GetCurrentUser(users),
    },
    projects: {
      listProjects: new ListProjects(projects),
      createProject: new CreateProject(projects),
      getProject: new GetProject(projects),
      updateProject: new UpdateProject(projects),
      deleteProject: new DeleteProject(projects),
      listProjectGenerations: new ListProjectGenerations(projects, generations),
    },
    generations: {
      createGeneration: new CreateGeneration({
        projects,
        generations,
        runner,
        background,
        clock,
        limits: {
          perUser: env.GENERATION_DAILY_LIMIT_PER_USER,
          global: env.GENERATION_DAILY_LIMIT_GLOBAL,
        },
      }),
      getGeneration: new GetGeneration(generations, clock),
      answerClarification: new AnswerClarification({
        projects,
        generations,
        runner,
        background,
        clock,
      }),
    },
    tokens,
    // En local se trabaja por HTTP y una cookie Secure no llegaría a guardarse.
    cookies: { secure: env.NODE_ENV === 'production' },
  });

  return { app, database };
}
