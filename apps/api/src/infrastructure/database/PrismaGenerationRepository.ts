import {
  clarificationAnswerSchema,
  clarifyingQuestionSchema,
  errorCodeSchema,
  specificationSchema,
  type ClarificationAnswer,
  type ClarifyingQuestion,
  type ErrorCode,
  type Specification,
} from '@devpilot/shared';
import { z } from 'zod';
import type { Generation, GenerationUsage } from '../../domain/entities/Generation.js';
import type {
  GenerationPage,
  GenerationRepository,
  NewGeneration,
  PageRequest,
} from '../../domain/repositories/GenerationRepository.js';
import type { Generation as GenerationRow } from './generated/client.js';
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
  ): Promise<boolean> {
    // El estado va en la condición del UPDATE: de dos envíos a la vez, solo uno cambia la fila.
    const { count } = await this.prisma.generation.updateMany({
      where: { id: generationId, project: { userId }, status: 'needs_clarification' },
      data: { status: 'generating', clarificationAnswers: answers, answeredAt: at },
    });
    return count === 1;
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
