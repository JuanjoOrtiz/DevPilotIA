// Punto de composición: el único fichero que importa de todas las capas.
// Crea las implementaciones de infrastructure y las inyecta en los casos de uso.
// No arranca nada: de eso se encargan main.ts (servidor) e index.ts (Vercel).
import type { Express } from 'express';
import { SessionIssuer } from './application/services/SessionIssuer.js';
import { CheckHealth } from './application/use-cases/CheckHealth.js';
import { CreateProject } from './application/use-cases/CreateProject.js';
import { DeleteProject } from './application/use-cases/DeleteProject.js';
import { GetCurrentUser } from './application/use-cases/GetCurrentUser.js';
import { GetProject } from './application/use-cases/GetProject.js';
import { ListProjectGenerations } from './application/use-cases/ListProjectGenerations.js';
import { ListProjects } from './application/use-cases/ListProjects.js';
import { LoginUser } from './application/use-cases/LoginUser.js';
import { LogoutUser } from './application/use-cases/LogoutUser.js';
import { RefreshSession } from './application/use-cases/RefreshSession.js';
import { RegisterUser } from './application/use-cases/RegisterUser.js';
import { UpdateProject } from './application/use-cases/UpdateProject.js';
import type { PasswordHasher } from './domain/providers/PasswordHasher.js';
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
import { createApp } from './presentation/http/app.js';

export interface CompositionOptions {
  databasePool?: DatabasePoolOptions;
  /** Los tests inyectan uno más rápido; por defecto, bcrypt con su coste de producción. */
  passwordHasher?: PasswordHasher;
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
    tokens,
    // En local se trabaja por HTTP y una cookie Secure no llegaría a guardarse.
    cookies: { secure: env.NODE_ENV === 'production' },
  });

  return { app, database };
}
