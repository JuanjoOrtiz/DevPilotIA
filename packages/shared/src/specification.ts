import { z } from 'zod';
import { complexitySchema } from './generation.js';
import { fieldError } from './validation.js';

/**
 * Límites de la especificación (docs/ai-contract.md). El mismo esquema valida la respuesta
 * del modelo y, más adelante, las ediciones manuales.
 */
export const SPEC_LIMITS = {
  title: 120,
  text: 4000,
  shortText: 600,
  assumptions: 6,
  userStories: 8,
  acceptanceCriteria: 10,
  tasks: 15,
  risks: 10,
  edgeCases: 12,
  testCases: 15,
  steps: 12,
} as const;

/** Límites de las preguntas aclaratorias (RF-GEN-09). */
export const CLARIFICATION_LIMITS = {
  minQuestions: 2,
  maxQuestions: 4,
  question: 200,
  why: 200,
  answer: 500,
} as const;

// Los motivos de error son códigos de FIELD_ERRORS: el editor los traduce (RF-EDI-02).
const text = (max: number = SPEC_LIMITS.text) =>
  z
    .string(fieldError('TEXT_REQUIRED'))
    .trim()
    .min(1, fieldError('TEXT_REQUIRED'))
    .max(max, fieldError('TEXT_TOO_LONG'));

export const SEVERITIES = ['low', 'medium', 'high'] as const;
export const severitySchema = z.enum(SEVERITIES);
export type Severity = z.infer<typeof severitySchema>;

export const TEST_TYPES = ['unit', 'integration', 'e2e'] as const;
export const testTypeSchema = z.enum(TEST_TYPES);
export type TestType = z.infer<typeof testTypeSchema>;

const taskSchema = z.object({
  title: text(SPEC_LIMITS.title),
  description: text(SPEC_LIMITS.shortText),
});
export type SpecTask = z.infer<typeof taskSchema>;

export const specificationSchema = z.object({
  schemaVersion: z.literal(1),
  title: text(SPEC_LIMITS.title),
  /** Lo que la IA ha asumido sin que el usuario lo dijera (RF-GEN-10). */
  assumptions: z
    .array(text(SPEC_LIMITS.shortText))
    .max(SPEC_LIMITS.assumptions, fieldError('TOO_MANY_ITEMS')),
  technicalDescription: text(),
  userStories: z
    .array(
      z.object({
        asA: text(SPEC_LIMITS.shortText),
        iWant: text(SPEC_LIMITS.shortText),
        soThat: text(SPEC_LIMITS.shortText),
        acceptanceCriteria: z
          .array(text(SPEC_LIMITS.shortText))
          .min(1, fieldError('LIST_REQUIRED'))
          .max(SPEC_LIMITS.acceptanceCriteria, fieldError('TOO_MANY_ITEMS')),
      }),
    )
    .min(1, fieldError('LIST_REQUIRED'))
    .max(SPEC_LIMITS.userStories, fieldError('TOO_MANY_ITEMS')),
  tasks: z.object({
    frontend: z.array(taskSchema).max(SPEC_LIMITS.tasks, fieldError('TOO_MANY_ITEMS')),
    backend: z.array(taskSchema).max(SPEC_LIMITS.tasks, fieldError('TOO_MANY_ITEMS')),
  }),
  risks: z
    .array(
      z.object({
        description: text(SPEC_LIMITS.shortText),
        severity: severitySchema,
        mitigation: text(SPEC_LIMITS.shortText),
      }),
    )
    .max(SPEC_LIMITS.risks, fieldError('TOO_MANY_ITEMS')),
  edgeCases: z
    .array(text(SPEC_LIMITS.shortText))
    .max(SPEC_LIMITS.edgeCases, fieldError('TOO_MANY_ITEMS')),
  testCases: z
    .array(
      z.object({
        title: text(SPEC_LIMITS.title),
        type: testTypeSchema,
        steps: z
          .array(text(SPEC_LIMITS.shortText))
          .min(1, fieldError('LIST_REQUIRED'))
          .max(SPEC_LIMITS.steps, fieldError('TOO_MANY_ITEMS')),
        expectedResult: text(SPEC_LIMITS.shortText),
      }),
    )
    .max(SPEC_LIMITS.testCases, fieldError('TOO_MANY_ITEMS')),
  complexity: z.object({
    size: complexitySchema,
    rationale: text(SPEC_LIMITS.shortText),
  }),
});
export type Specification = z.infer<typeof specificationSchema>;

export const clarifyingQuestionSchema = z.object({
  id: z.string().regex(/^q[1-9]$/),
  question: text(CLARIFICATION_LIMITS.question),
  /** Qué parte de la especificación depende de la respuesta. */
  why: text(CLARIFICATION_LIMITS.why),
});
export type ClarifyingQuestion = z.infer<typeof clarifyingQuestionSchema>;

/** Preguntas con identificadores distintos. */
export const clarifyingQuestionsSchema = z
  .array(clarifyingQuestionSchema)
  .min(CLARIFICATION_LIMITS.minQuestions)
  .max(CLARIFICATION_LIMITS.maxQuestions)
  .refine((questions) => new Set(questions.map((q) => q.id)).size === questions.length, {
    message: 'Question ids must be unique',
  });

/** Una respuesta guardada. En blanco si el usuario no la contestó. */
export const clarificationAnswerSchema = z.object({
  questionId: z.string(),
  answer: z.string().max(CLARIFICATION_LIMITS.answer),
});
export type ClarificationAnswer = z.infer<typeof clarificationAnswerSchema>;

/** Primera llamada al modelo: o pregunta o especifica (RF-GEN-09). */
export const firstModelResponseSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('questions'), questions: clarifyingQuestionsSchema }),
  z.object({ kind: z.literal('specification'), specification: specificationSchema }),
]);
export type FirstModelResponse = z.infer<typeof firstModelResponseSchema>;

/** Segunda llamada, con las respuestas: solo admite la especificación. */
export const finalModelResponseSchema = z.object({
  kind: z.literal('specification'),
  specification: specificationSchema,
});
export type FinalModelResponse = z.infer<typeof finalModelResponseSchema>;
