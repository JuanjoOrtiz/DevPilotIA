// Dobles en memoria para los tests unitarios. No se compilan ni se despliegan.
import { randomUUID } from 'node:crypto';
import type {
  ClarificationAnswer,
  ClarifyingQuestion,
  ErrorCode,
  SpecLanguage,
  Specification,
} from '@devpilot/shared';
import type {
  Generation,
  GenerationSummary,
  GenerationUsage,
  SpecTranslation,
} from '../domain/entities/Generation.js';
import type { Project, ProjectOverview } from '../domain/entities/Project.js';
import type { RefreshToken } from '../domain/entities/RefreshToken.js';
import type { User } from '../domain/entities/User.js';
import { DomainError } from '../domain/errors/DomainError.js';
import type { Clock } from '../domain/providers/Clock.js';
import type { PasswordHasher } from '../domain/providers/PasswordHasher.js';
import type {
  IssuedAccessToken,
  IssuedRefreshToken,
  TokenService,
  TokenSubject,
} from '../domain/providers/TokenService.js';
import type {
  DashboardRepository,
  DashboardTotalsData,
} from '../domain/repositories/DashboardRepository.js';
import type {
  GenerationPage,
  GenerationRepository,
  NewGeneration,
  PageRequest,
} from '../domain/repositories/GenerationRepository.js';
import type { ProjectData, ProjectRepository } from '../domain/repositories/ProjectRepository.js';
import type {
  NewRefreshToken,
  RefreshTokenRepository,
} from '../domain/repositories/RefreshTokenRepository.js';
import type { NewUser, UserRepository } from '../domain/repositories/UserRepository.js';

export const ACCESS_TOKEN_SECONDS = 15 * 60;
export const REFRESH_TOKEN_MS = 7 * 24 * 60 * 60 * 1000;

export class FixedClock implements Clock {
  private current: Date;

  constructor(start = new Date('2026-10-11T10:00:00.000Z')) {
    this.current = start;
  }

  now(): Date {
    return new Date(this.current);
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}

export class InMemoryUserRepository implements UserRepository {
  readonly users: User[] = [];
  private readonly clock: Clock;

  constructor(clock: Clock = new FixedClock()) {
    this.clock = clock;
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.users.find((user) => user.id === id) ?? null);
  }

  findByEmail(email: string): Promise<User | null> {
    return Promise.resolve(this.users.find((user) => user.email === email) ?? null);
  }

  create(input: NewUser): Promise<User> {
    if (this.users.some((user) => user.email === input.email)) {
      return Promise.reject(
        new DomainError('EMAIL_ALREADY_REGISTERED', 'An account with this email already exists'),
      );
    }
    const user: User = { id: randomUUID(), createdAt: this.clock.now(), ...input };
    this.users.push(user);
    return Promise.resolve(user);
  }

  remove(id: string): void {
    const index = this.users.findIndex((user) => user.id === id);
    if (index >= 0) this.users.splice(index, 1);
  }
}

export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  readonly tokens: RefreshToken[] = [];

  create(input: NewRefreshToken): Promise<void> {
    this.tokens.push({ id: randomUUID(), revokedAt: null, ...input });
    return Promise.resolve();
  }

  findByHash(tokenHash: string): Promise<RefreshToken | null> {
    const found = this.tokens.find((token) => token.tokenHash === tokenHash);
    return Promise.resolve(found ? { ...found } : null);
  }

  revokeIfActive(id: string, at: Date): Promise<boolean> {
    const token = this.tokens.find((candidate) => candidate.id === id);
    if (!token || token.revokedAt !== null) return Promise.resolve(false);
    token.revokedAt = at;
    return Promise.resolve(true);
  }

  revokeAllForUser(userId: string, at: Date): Promise<void> {
    for (const token of this.tokens) {
      if (token.userId === userId && token.revokedAt === null) token.revokedAt = at;
    }
    return Promise.resolve();
  }

  activeFor(userId: string): RefreshToken[] {
    return this.tokens.filter((token) => token.userId === userId && token.revokedAt === null);
  }
}

interface StoredGeneration extends Generation {
  /** Dueño del proyecto: en la base de datos sale de la relación con `projects`. */
  userId: string;
  usage: GenerationUsage;
}

const NO_USAGE: GenerationUsage = {
  model: null,
  attempts: 0,
  durationMs: 0,
  inputTokens: 0,
  outputTokens: 0,
};

function withoutOwner({ userId: _userId, usage: _usage, ...generation }: StoredGeneration) {
  return structuredClone(generation);
}

export class InMemoryGenerationRepository implements GenerationRepository {
  readonly generations: StoredGeneration[] = [];
  private readonly clock: Clock;
  /** Dueño de cada proyecto, para crear generaciones como lo haría la base de datos. */
  private readonly owners = new Map<string, string>();

  constructor(clock: Clock = new FixedClock()) {
    this.clock = clock;
  }

  registerProject(project: Pick<Project, 'id' | 'userId'>): void {
    this.owners.set(project.id, project.userId);
  }

  pageForProject(
    userId: string,
    projectId: string,
    { page, pageSize }: PageRequest,
  ): Promise<GenerationPage> {
    const all = this.generations
      .filter((generation) => generation.projectId === projectId && generation.userId === userId)
      .toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const start = (page - 1) * pageSize;

    return Promise.resolve({
      items: all.slice(start, start + pageSize).map(summaryOf),
      total: all.length,
    });
  }

  create(projectId: string, data: NewGeneration): Promise<Generation> {
    const userId = this.owners.get(projectId);
    if (!userId) return Promise.reject(new Error(`Unknown project ${projectId}`));
    const generation = this.store({ id: projectId, userId }, { ...data, status: 'generating' });
    return Promise.resolve(withoutOwner(generation));
  }

  findForUser(userId: string, generationId: string): Promise<Generation | null> {
    const found = this.owned(userId, generationId);
    return Promise.resolve(found ? withoutOwner(found) : null);
  }

  countForUserSince(userId: string, since: Date): Promise<number> {
    return Promise.resolve(
      this.generations.filter((g) => g.userId === userId && g.createdAt >= since && !g.isSample)
        .length,
    );
  }

  countAllSince(since: Date): Promise<number> {
    return Promise.resolve(
      this.generations.filter((g) => g.createdAt >= since && !g.isSample).length,
    );
  }

  saveAnswers(
    userId: string,
    generationId: string,
    answers: ClarificationAnswer[],
    at: Date,
    language: SpecLanguage,
  ): Promise<boolean> {
    const generation = this.owned(userId, generationId);
    if (generation?.status !== 'needs_clarification') return Promise.resolve(false);
    Object.assign(generation, {
      status: 'generating',
      clarificationAnswers: structuredClone(answers),
      answeredAt: at,
      language,
    });
    return Promise.resolve(true);
  }

  saveTranslation(
    userId: string,
    generationId: string,
    language: SpecLanguage,
    translation: SpecTranslation,
  ): Promise<void> {
    const generation = this.owned(userId, generationId);
    if (generation) {
      generation.translations = {
        ...generation.translations,
        [language]: structuredClone(translation),
      };
    }
    return Promise.resolve();
  }

  complete(
    generationId: string,
    specification: Specification,
    usage: GenerationUsage,
    at: Date,
  ): Promise<void> {
    this.finish(generationId, usage, {
      status: 'completed',
      aiSpec: structuredClone(specification),
      title: specification.title,
      complexity: specification.complexity.size,
      completedAt: at,
    });
    return Promise.resolve();
  }

  requestClarification(
    generationId: string,
    questions: ClarifyingQuestion[],
    usage: GenerationUsage,
  ): Promise<void> {
    this.finish(generationId, usage, {
      status: 'needs_clarification',
      clarifyingQuestions: structuredClone(questions),
    });
    return Promise.resolve();
  }

  fail(generationId: string, code: ErrorCode, usage: GenerationUsage): Promise<void> {
    this.finish(generationId, usage, { status: 'failed', errorCode: code });
    return Promise.resolve();
  }

  failIfStale(userId: string, generationId: string, before: Date): Promise<boolean> {
    const generation = this.owned(userId, generationId);
    if (generation?.status !== 'generating') return Promise.resolve(false);
    if ((generation.answeredAt ?? generation.createdAt) >= before) return Promise.resolve(false);
    Object.assign(generation, { status: 'failed', errorCode: 'LLM_TIMEOUT' });
    return Promise.resolve(true);
  }

  /** Guarda una generación ya terminada, como las que deja el flujo de generación. */
  add(
    project: Pick<Project, 'id' | 'userId'>,
    overrides: Partial<Generation> = {},
    usage: Partial<GenerationUsage> = {},
  ): GenerationSummary {
    const stored = this.store(project, overrides);
    stored.usage = { ...stored.usage, ...usage };
    return summaryOf(stored);
  }

  /** Lo que se ha acumulado de una generación: modelo, intentos y tokens. */
  usageOf(generationId: string): GenerationUsage {
    const found = this.generations.find((generation) => generation.id === generationId);
    if (!found) throw new Error(`Unknown generation ${generationId}`);
    return { ...found.usage };
  }

  forProject(projectId: string): GenerationSummary[] {
    return this.generations
      .filter((generation) => generation.projectId === projectId)
      .map(summaryOf);
  }

  removeForProject(projectId: string): void {
    const kept = this.generations.filter((generation) => generation.projectId !== projectId);
    this.generations.splice(0, this.generations.length, ...kept);
  }

  private store(
    project: Pick<Project, 'id' | 'userId'>,
    overrides: Partial<Generation>,
  ): StoredGeneration {
    const generation: StoredGeneration = {
      id: randomUUID(),
      projectId: project.id,
      userId: project.userId,
      type: 'feature',
      status: 'completed',
      title: 'Exportar el historial a CSV',
      inputText: 'Quiero exportar el historial de pedidos a CSV',
      additionalContext: null,
      complexity: 'M',
      errorCode: null,
      clarifyingQuestions: null,
      clarificationAnswers: null,
      aiSpec: null,
      editedSpec: null,
      language: 'es',
      translations: {},
      editedAt: null,
      answeredAt: null,
      completedAt: null,
      isSample: false,
      createdAt: this.clock.now(),
      usage: { ...NO_USAGE },
      ...overrides,
    };
    if (generation.status === 'generating') {
      Object.assign(generation, { title: null, complexity: null });
    }
    this.generations.push(generation);
    return generation;
  }

  private owned(userId: string, generationId: string): StoredGeneration | undefined {
    return this.generations.find((g) => g.id === generationId && g.userId === userId);
  }

  /** Como la base de datos: solo cambia una generación que sigue en `generating`. */
  private finish(generationId: string, usage: GenerationUsage, changes: Partial<Generation>) {
    const generation = this.generations.find((g) => g.id === generationId);
    if (generation?.status !== 'generating') return;
    Object.assign(generation, changes);
    generation.usage = {
      model: usage.model ?? generation.usage.model,
      attempts: generation.usage.attempts + usage.attempts,
      durationMs: generation.usage.durationMs + usage.durationMs,
      inputTokens: generation.usage.inputTokens + usage.inputTokens,
      outputTokens: generation.usage.outputTokens + usage.outputTokens,
    };
  }
}

function summaryOf(generation: StoredGeneration): GenerationSummary {
  return {
    id: generation.id,
    projectId: generation.projectId,
    type: generation.type,
    status: generation.status,
    title: generation.title,
    inputText: generation.inputText,
    complexity: generation.complexity,
    editedAt: generation.editedAt,
    isSample: generation.isSample,
    createdAt: generation.createdAt,
  };
}

export class InMemoryProjectRepository implements ProjectRepository {
  readonly projects: Project[] = [];
  private readonly clock: Clock;
  private readonly generations: InMemoryGenerationRepository;

  constructor(clock: Clock, generations: InMemoryGenerationRepository) {
    this.clock = clock;
    this.generations = generations;
  }

  listForUser(userId: string): Promise<ProjectOverview[]> {
    return Promise.resolve(
      this.projects
        .filter((project) => project.userId === userId)
        .map((project) => this.overview(project)),
    );
  }

  findForUser(userId: string, projectId: string): Promise<ProjectOverview | null> {
    const project = this.owned(userId, projectId);
    return Promise.resolve(project ? this.overview(project) : null);
  }

  create(userId: string, data: ProjectData): Promise<Project> {
    const now = this.clock.now();
    const project: Project = { id: randomUUID(), userId, ...data, createdAt: now, updatedAt: now };
    this.projects.push(project);
    this.generations.registerProject(project);
    return Promise.resolve({ ...project });
  }

  updateForUser(
    userId: string,
    projectId: string,
    changes: Partial<ProjectData>,
  ): Promise<ProjectOverview | null> {
    const project = this.owned(userId, projectId);
    if (!project) return Promise.resolve(null);

    Object.assign(project, changes, { updatedAt: this.clock.now() });
    return Promise.resolve(this.overview(project));
  }

  deleteForUser(userId: string, projectId: string): Promise<boolean> {
    const project = this.owned(userId, projectId);
    if (!project) return Promise.resolve(false);

    this.projects.splice(this.projects.indexOf(project), 1);
    this.generations.removeForProject(projectId);
    return Promise.resolve(true);
  }

  private owned(userId: string, projectId: string): Project | undefined {
    return this.projects.find((project) => project.id === projectId && project.userId === userId);
  }

  private overview(project: Project): ProjectOverview {
    const dates = this.generations
      .forProject(project.id)
      .map((generation) => generation.createdAt.getTime());

    return {
      ...project,
      techStack: [...project.techStack],
      generationCount: dates.length,
      lastGenerationAt: dates.length > 0 ? new Date(Math.max(...dates)) : null,
    };
  }
}

/** «Hash» legible: deja ver en los tests qué contraseña se guardó, sin coste de CPU. */
export class FakePasswordHasher implements PasswordHasher {
  readonly verified: string[] = [];

  hash(password: string): Promise<string> {
    return Promise.resolve(`hashed(${password})`);
  }

  verify(password: string, hash: string): Promise<boolean> {
    this.verified.push(hash);
    return Promise.resolve(hash === `hashed(${password})`);
  }
}

/** Tokens opacos y distintos en cada emisión, con la caducidad que marca el reloj. */
export class FakeTokenService implements TokenService {
  private readonly clock: Clock;
  private readonly subjects = new Map<string, { userId: string; expiresAt: Date }>();
  private counter = 0;

  constructor(clock: Clock) {
    this.clock = clock;
  }

  issueAccessToken(userId: string): Promise<IssuedAccessToken> {
    const token = this.remember('access', userId, ACCESS_TOKEN_SECONDS * 1000);
    return Promise.resolve({ token, expiresIn: ACCESS_TOKEN_SECONDS });
  }

  verifyAccessToken(token: string): Promise<TokenSubject | null> {
    return Promise.resolve(this.read('access', token));
  }

  issueRefreshToken(userId: string): Promise<IssuedRefreshToken> {
    const token = this.remember('refresh', userId, REFRESH_TOKEN_MS);
    return Promise.resolve({
      token,
      expiresAt: new Date(this.clock.now().getTime() + REFRESH_TOKEN_MS),
    });
  }

  verifyRefreshToken(token: string): Promise<TokenSubject | null> {
    return Promise.resolve(this.read('refresh', token));
  }

  hashRefreshToken(token: string): string {
    return `sha(${token})`;
  }

  private remember(kind: string, userId: string, lifetimeMs: number): string {
    this.counter += 1;
    const token = `${kind}-${this.counter}`;
    this.subjects.set(token, {
      userId,
      expiresAt: new Date(this.clock.now().getTime() + lifetimeMs),
    });
    return token;
  }

  private read(kind: string, token: string): TokenSubject | null {
    const subject = this.subjects.get(token);
    if (!subject || !token.startsWith(`${kind}-`)) return null;
    if (subject.expiresAt <= this.clock.now()) return null;
    return { userId: subject.userId };
  }
}

/** Los agregados del dashboard calculados sobre los dobles de proyectos y generaciones. */
export class InMemoryDashboardRepository implements DashboardRepository {
  private readonly projects: InMemoryProjectRepository;
  private readonly generations: InMemoryGenerationRepository;

  constructor(projects: InMemoryProjectRepository, generations: InMemoryGenerationRepository) {
    this.projects = projects;
    this.generations = generations;
  }

  totalsForUser(userId: string): Promise<DashboardTotalsData> {
    const mine = this.generations.generations.filter((g) => g.userId === userId);
    const completed = mine.filter((g) => g.status === 'completed');
    const timed = completed.filter((g) => !g.isSample && g.usage.durationMs > 0);
    const completedByComplexity: DashboardTotalsData['completedByComplexity'] = {};
    for (const generation of completed) {
      if (generation.complexity) {
        completedByComplexity[generation.complexity] =
          (completedByComplexity[generation.complexity] ?? 0) + 1;
      }
    }

    return Promise.resolve({
      projects: this.projects.projects.filter((project) => project.userId === userId).length,
      generations: mine.length,
      features: mine.filter((g) => g.type === 'feature').length,
      bugs: mine.filter((g) => g.type === 'bug').length,
      completed: completed.length,
      failed: mine.filter((g) => g.status === 'failed').length,
      averageDurationMs:
        timed.length > 0
          ? timed.reduce((sum, g) => sum + g.usage.durationMs, 0) / timed.length
          : null,
      completedByComplexity,
    });
  }

  creationDatesForUser(userId: string, since: Date): Promise<Date[]> {
    return Promise.resolve(
      this.generations.generations
        .filter((g) => g.userId === userId && g.createdAt >= since)
        .map((g) => g.createdAt),
    );
  }
}
