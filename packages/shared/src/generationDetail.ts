import { z } from 'zod';
import { errorCodeSchema } from './errors.js';
import {
  complexitySchema,
  GENERATION_TYPES,
  generationStatusSchema,
  generationTypeSchema,
} from './generation.js';
import {
  CLARIFICATION_LIMITS,
  clarificationAnswerSchema,
  clarifyingQuestionSchema,
  specificationSchema,
} from './specification.js';
import { fieldError } from './validation.js';

/** Límites de la entrada de una generación (RF-GEN-01 y SEG-13). */
export const GENERATION_INPUT_LIMITS = {
  inputMin: 20,
  inputMax: 4000,
  additionalContext: 2000,
} as const;

/** Cuerpo de `POST /projects/:id/generations`. El contexto del proyecto lo añade el servidor. */
export const createGenerationRequestSchema = z.object({
  type: z.enum(GENERATION_TYPES, fieldError('GENERATION_TYPE_INVALID')),
  inputText: z
    .string(fieldError('INPUT_TOO_SHORT'))
    .trim()
    .min(GENERATION_INPUT_LIMITS.inputMin, fieldError('INPUT_TOO_SHORT'))
    .max(GENERATION_INPUT_LIMITS.inputMax, fieldError('INPUT_TOO_LONG')),
  additionalContext: z
    .string(fieldError('CONTEXT_TOO_LONG'))
    .trim()
    .max(GENERATION_INPUT_LIMITS.additionalContext, fieldError('CONTEXT_TOO_LONG'))
    .optional()
    // Un contexto vacío equivale a no darlo.
    .transform((value) => (value ? value : null)),
});
export type CreateGenerationRequest = z.input<typeof createGenerationRequestSchema>;
export type CreateGenerationInput = z.output<typeof createGenerationRequestSchema>;

const answer = z.object({
  questionId: z.string(fieldError('ANSWER_UNKNOWN_QUESTION')).max(10),
  answer: z
    .string(fieldError('ANSWER_TOO_LONG'))
    .trim()
    .max(CLARIFICATION_LIMITS.answer, fieldError('ANSWER_TOO_LONG')),
});

/**
 * Cuerpo de `POST /generations/:id/answers`: las respuestas, alguna puede ir en blanco, o
 * `skip: true` para generar sin responder (RF-GEN-09).
 */
export const answerClarificationRequestSchema = z.union(
  [
    z.object({ skip: z.literal(true) }).strict(),
    z
      .object({
        answers: z.array(answer).max(CLARIFICATION_LIMITS.maxQuestions),
      })
      .strict(),
  ],
  fieldError('ANSWERS_INVALID'),
);
export type AnswerClarificationRequest = z.infer<typeof answerClarificationRequestSchema>;

/** Una generación completa, tal y como la devuelve `GET /generations/:id`. */
export const generationDetailSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  type: generationTypeSchema,
  status: generationStatusSchema,
  inputText: z.string(),
  additionalContext: z.string().nullable(),
  /** Por qué falló; solo en `failed`. */
  errorCode: errorCodeSchema.nullable(),
  clarifyingQuestions: z.array(clarifyingQuestionSchema).nullable(),
  clarificationAnswers: z.array(clarificationAnswerSchema).nullable(),
  /** La versión vigente: la editada si existe y, si no, la de la IA. */
  specification: specificationSchema.nullable(),
  title: z.string().nullable(),
  complexity: complexitySchema.nullable(),
  isEdited: z.boolean(),
  isSample: z.boolean(),
  createdAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
});
export type GenerationDetail = z.infer<typeof generationDetailSchema>;

export const generationResponseSchema = z.object({ generation: generationDetailSchema });
export type GenerationResponse = z.infer<typeof generationResponseSchema>;

/** Detalle de un 429 por límite de uso: cuándo vuelve a haber cupo (RF-GEN-07). */
export const quotaErrorDetailsSchema = z.object({
  limit: z.number().int().positive(),
  resetsAt: z.iso.datetime(),
});
export type QuotaErrorDetails = z.infer<typeof quotaErrorDetailsSchema>;
