import type { PrismaClient } from '../prismaClient.js';
import {
  SAMPLE_GENERATIONS,
  SAMPLE_PROJECTS,
  toEditedSpecification,
  toSpecification,
  type SampleGeneration,
} from './sampleData.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
/** El modelo que figura en las generaciones de ejemplo. */
const SAMPLE_MODEL = 'gemini-3.5-flash-lite';

/**
 * `local` crea el usuario si no existe. `production` nunca crea usuarios: solo carga los
 * datos en una cuenta que ya existe (SEG-16).
 */
export type SeedMode = 'local' | 'production';

export interface SeedOptions {
  mode: SeedMode;
  email: string;
  /** Solo en local, para crear el usuario de ejemplo. */
  password?: string;
  /** Solo en local: el nombre del usuario de ejemplo. */
  name?: string;
  hashPassword: (password: string) => Promise<string>;
  now: Date;
}

export interface SeedResult {
  userId: string;
  createdUser: boolean;
  projects: number;
  generations: number;
}

export class SeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeedError';
  }
}

async function findOrCreateUser(
  prisma: PrismaClient,
  options: SeedOptions,
): Promise<{ id: string; created: boolean }> {
  const email = options.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { id: existing.id, created: false };

  if (options.mode === 'production') {
    throw new SeedError(
      `There is no account with the email ${email}. In production the seed never creates users: register first and run it again.`,
    );
  }
  if (!options.password) throw new SeedError('A password is needed to create the local user.');

  const user = await prisma.user.create({
    data: {
      name: options.name ?? 'Usuario de ejemplo',
      email,
      passwordHash: await options.hashPassword(options.password),
    },
    select: { id: true },
  });
  return { id: user.id, created: true };
}

/** Las columnas de una generación de ejemplo, con sus fechas relativas a `now`. */
function generationData(entry: SampleGeneration, now: Date) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  // Hoy, una hora que aún no ha llegado se adelanta para no crear nada en el futuro.
  const createdAt = new Date(
    Math.min(today - entry.daysAgo * DAY_MS + entry.hour * HOUR_MS, now.getTime() - HOUR_MS),
  );
  const base = {
    type: entry.type,
    inputText: entry.inputText,
    status: entry.status,
    createdAt,
  };

  switch (entry.status) {
    case 'completed': {
      const aiSpec = toSpecification(entry.spec);
      const completedAt = new Date(createdAt.getTime() + entry.durationMs);
      const editedSpec = entry.edit ? toEditedSpecification(aiSpec, entry.edit) : null;
      return {
        ...base,
        aiSpec,
        title: aiSpec.title,
        complexity: aiSpec.complexity.size,
        model: SAMPLE_MODEL,
        attempts: 1,
        durationMs: entry.durationMs,
        inputTokens: 1_400 + entry.inputText.length,
        outputTokens: 1_800 + Math.round(entry.durationMs / 10),
        completedAt,
        ...(editedSpec && {
          editedSpec,
          editedAt: new Date(completedAt.getTime() + 20 * 60 * 1000),
        }),
      };
    }
    case 'failed':
      return {
        ...base,
        errorCode: entry.errorCode,
        model: SAMPLE_MODEL,
        attempts: 3,
        durationMs: 0,
        inputTokens: 0,
        outputTokens: 0,
      };
    case 'needs_clarification':
      return {
        ...base,
        clarifyingQuestions: entry.questions,
        model: SAMPLE_MODEL,
        attempts: 1,
        durationMs: 5_200,
        inputTokens: 1_300,
        outputTokens: 240,
      };
  }
}

/**
 * Carga los datos de demostración en una cuenta. Es repetible: borra antes los proyectos
 * de ejemplo de esa cuenta (los que tienen los mismos nombres) y los vuelve a crear con
 * fechas de los últimos 30 días. No toca ningún otro proyecto.
 */
export async function seedDemoData(
  prisma: PrismaClient,
  options: SeedOptions,
): Promise<SeedResult> {
  const user = await findOrCreateUser(prisma, options);

  const generations = await prisma.$transaction(async (tx) => {
    await tx.project.deleteMany({
      where: { userId: user.id, name: { in: SAMPLE_PROJECTS.map((project) => project.name) } },
    });

    let count = 0;
    for (const sample of SAMPLE_PROJECTS) {
      const entries = SAMPLE_GENERATIONS.filter((entry) => entry.project === sample.key);
      const { key: _key, ...data } = sample;
      const project = await tx.project.create({ data: { ...data, userId: user.id } });
      const result = await tx.generation.createMany({
        data: entries.map((entry) => ({
          projectId: project.id,
          ...generationData(entry, options.now),
        })),
      });
      count += result.count;
    }
    return count;
  });

  return {
    userId: user.id,
    createdUser: user.created,
    projects: SAMPLE_PROJECTS.length,
    generations,
  };
}
