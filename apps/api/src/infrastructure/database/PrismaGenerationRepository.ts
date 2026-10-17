import {
  clarificationAnswerSchema,
  clarifyingQuestionSchema,
  errorCodeSchema,
  specificationSchema,
  type ClarificationAnswer,
  type ClarifyingQuestion,
  type ErrorCode,
  type SpecLanguage,
  type Specification,
  specLanguageSchema,
} from '@devpilot/shared';
import { z } from 'zod';
import type {
  Generation,
  GenerationUsage,
  SpecTranslation,
  SpecTranslations,
} from '../../domain/entities/Generation.js';
import type {
  GenerationPage,
  GenerationRepository,
  NewGeneration,
  NewSampleGeneration,
  PageRequest,
} from '../../domain/repositories/GenerationRepository.js';
import { Prisma, type Generation as GenerationRow } from './generated/client.js';
import type { PrismaClient } from './prismaClient.js';

/** Las columnas del historial. La especificación (JSON) no se lee para pintar una lista. */
const SUMMARY = {
  id: true,
  projectId: true,
  type: true,
  status: true,
  title: true,
  inputText: true,
  complexity: true,
  editedAt: true,
  isSample: true,
  createdAt: true,
} as const;

const questionsSchema = z.array(clarifyingQuestionSchema);
const answersSchema = z.array(clarificationAnswerSchema);
const translationsSchema = z.partialRecord(
  specLanguageSchema,
  z.object({ source: z.string(), specification: specificationSchema }),
);

/**
 * Lee un JSON de la base de datos con su esquema. Lo guardado ya se validó al escribirlo;
 * si aun así no encaja (una versión antigua del esquema), se trata como si no existiera.
 */
function readJson<T>(schema: z.ZodType<T>, value: unknown): T | null {
  if (value === null || value === undefined) return null;
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function toGeneration(row: GenerationRow): Generation {
  const errorCode = errorCodeSchema.safeParse(row.errorCode);
  return {
    id: row.id,
    projectId: row.projectId,
    type: row.type,
    status: row.status,
    title: row.title,
    inputText: row.inputText,
    additionalContext: row.additionalContext,
    complexity: row.complexity,
    errorCode: errorCode.success ? errorCode.data : null,
    clarifyingQuestions: readJson(questionsSchema, row.clarifyingQuestions),
    clarificationAnswers: readJson(answersSchema, row.clarificationAnswers),
    aiSpec: readJson(specificationSchema, row.aiSpec),
    editedSpec: readJson(specificationSchema, row.editedSpec),
    language: specLanguageSchema.catch('es').parse(row.language),
    translations: (readJson(translationsSchema, row.translations) ?? {}) as SpecTranslations,
    editedAt: row.editedAt,
    answeredAt: row.answeredAt,
    completedAt: row.completedAt,
    isSample: row.isSample,
    createdAt: row.createdAt,
  };
}

/** El coste se suma: una generación con preguntas pasa dos veces por el modelo. */
function usageUpdate(usage: GenerationUsage) {
  return {
    ...(usage.model && { model: usage.model }),
    attempts: { increment: usage.attempts },
    durationMs: { increment: usage.durationMs },
    inputTokens: { increment: usage.inputTokens },
    outputTokens: { increment: usage.outputTokens },
  };
}

export class PrismaGenerationRepository implements GenerationRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async pageForProject(
    userId: string,
    projectId: string,
    { page, pageSize }: PageRequest,
  ): Promise<GenerationPage> {
    const where = { projectId, project: { userId } };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.generation.findMany({
        where,
        select: SUMMARY,
        // El id desempata dos generaciones creadas en el mismo milisegundo.
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.generation.count({ where }),
    ]);

    return { items, total };
  }

  async create(projectId: string, data: NewGeneration): Promise<Generation> {
    // Los contadores empiezan en 0 para poder sumar: en SQL, NULL + 1 sigue siendo NULL.
    const row = await this.prisma.generation.create({
      data: { projectId, ...data, durationMs: 0, inputTokens: 0, outputTokens: 0 },
    });
    return toGeneration(row);
  }

  async createSample(projectId: string, sample: NewSampleGeneration): Promise<Generation> {
    const { specification, createdAt, ...data } = sample;
    const row = await this.prisma.generation.create({
      data: {
        projectId,
        ...data,
        status: 'completed',
        aiSpec: specification,
        title: specification.title,
        complexity: specification.complexity.size,
        isSample: true,
        createdAt,
        completedAt: createdAt,
        durationMs: 0,
        inputTokens: 0,
        outputTokens: 0,
      },
    });
    return toGeneration(row);
  }

  async saveEdit(
    userId: string,
    generationId: string,
    specification: Specification,
    language: SpecLanguage,
    at: Date,
  ): Promise<boolean> {
    // La versión de la IA (ai_spec) no se toca, y su idioma se guarda la primera vez que se
    // edita: RF-EDI-03 puede restaurar las dos cosas.
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.generation.findFirst({
        where: { id: generationId, project: { userId }, status: 'completed' },
        select: { language: true, aiLanguage: true },
      });
      if (!current) return false;

      const { count } = await tx.generation.updateMany({
        where: { id: generationId, status: 'completed' },
        data: {
          editedSpec: specification,
          editedAt: at,
          title: specification.title,
          complexity: specification.complexity.size,
          language,
          aiLanguage: current.aiLanguage ?? current.language,
          translations: Prisma.DbNull,
        },
      });
      return count === 1;
    });
  }

  async restoreOriginal(userId: string, generationId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.generation.findFirst({
        where: {
          id: generationId,
          project: { userId },
          status: 'completed',
          editedAt: { not: null },
        },
        select: { aiSpec: true, language: true, aiLanguage: true },
      });
      const original = current ? readJson(specificationSchema, current.aiSpec) : null;
      if (!current || !original) return false;

      const { count } = await tx.generation.updateMany({
        where: { id: generationId, status: 'completed' },
        data: {
          editedSpec: Prisma.DbNull,
          editedAt: null,
          title: original.title,
          complexity: original.complexity.size,
          // Una edición anterior a guardar el idioma de la IA conserva el suyo.
          language: current.aiLanguage ?? current.language,
          aiLanguage: null,
          translations: Prisma.DbNull,
        },
      });
      return count === 1;
    });
  }

  async deleteForUser(userId: string, generationId: string): Promise<boolean> {
    const { count } = await this.prisma.generation.deleteMany({
      where: { id: generationId, project: { userId } },
    });
    return count === 1;
  }

  async findForUser(userId: string, generationId: string): Promise<Generation | null> {
    const row = await this.prisma.generation.findFirst({
      where: { id: generationId, project: { userId } },
    });
    return row ? toGeneration(row) : null;
  }

  countForUserSince(userId: string, since: Date): Promise<number> {
    return this.prisma.generation.count({
      where: { project: { userId }, createdAt: { gte: since }, isSample: false },
    });
  }

  countAllSince(since: Date): Promise<number> {
    return this.prisma.generation.count({
      where: { createdAt: { gte: since }, isSample: false },
    });
  }

  async saveAnswers(
    userId: string,
    generationId: string,
    answers: ClarificationAnswer[],
    at: Date,
    language: SpecLanguage,
  ): Promise<boolean> {
    // El estado va en la condición del UPDATE: de dos envíos a la vez, solo uno cambia la fila.
    const { count } = await this.prisma.generation.updateMany({
      where: { id: generationId, project: { userId }, status: 'needs_clarification' },
      data: { status: 'generating', clarificationAnswers: answers, answeredAt: at, language },
    });
    return count === 1;
  }

  async saveTranslation(
    userId: string,
    generationId: string,
    language: SpecLanguage,
    translation: SpecTranslation,
  ): Promise<void> {
    // Lectura y escritura en una transacción: dos traducciones a la vez no se pisan.
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.generation.findFirst({
        where: { id: generationId, project: { userId } },
        select: { translations: true },
      });
      if (!row) return;
      const current = readJson(translationsSchema, row.translations) ?? {};
      await tx.generation.update({
        where: { id: generationId },
        data: { translations: { ...current, [language]: translation } },
      });
    });
  }

  async complete(
    generationId: string,
    specification: Specification,
    usage: GenerationUsage,
    at: Date,
  ): Promise<void> {
    await this.prisma.generation.updateMany({
      where: { id: generationId, status: 'generating' },
      data: {
        status: 'completed',
        aiSpec: specification,
        title: specification.title,
        complexity: specification.complexity.size,
        completedAt: at,
        ...usageUpdate(usage),
      },
    });
  }

  async requestClarification(
    generationId: string,
    questions: ClarifyingQuestion[],
    usage: GenerationUsage,
  ): Promise<void> {
    await this.prisma.generation.updateMany({
      where: { id: generationId, status: 'generating' },
      data: {
        status: 'needs_clarification',
        clarifyingQuestions: questions,
        ...usageUpdate(usage),
      },
    });
  }

  async fail(generationId: string, code: ErrorCode, usage: GenerationUsage): Promise<void> {
    await this.prisma.generation.updateMany({
      where: { id: generationId, status: 'generating' },
      data: { status: 'failed', errorCode: code, ...usageUpdate(usage) },
    });
  }

  async failIfStale(userId: string, generationId: string, before: Date): Promise<boolean> {
    const { count } = await this.prisma.generation.updateMany({
      where: {
        id: generationId,
        project: { userId },
        status: 'generating',
        OR: [{ answeredAt: null, createdAt: { lt: before } }, { answeredAt: { lt: before } }],
      },
      data: { status: 'failed', errorCode: 'LLM_TIMEOUT' },
    });
    return count === 1;
  }
}
