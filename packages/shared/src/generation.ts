import { z } from 'zod';

export const GENERATION_TYPES = ['feature', 'bug'] as const;
export const generationTypeSchema = z.enum(GENERATION_TYPES);
export type GenerationType = z.infer<typeof generationTypeSchema>;

/** `needs_clarification`: la IA ha hecho preguntas y espera las respuestas (RF-GEN-09). */
export const GENERATION_STATUSES = [
  'generating',
  'needs_clarification',
  'completed',
  'failed',
] as const;
export const generationStatusSchema = z.enum(GENERATION_STATUSES);
export type GenerationStatus = z.infer<typeof generationStatusSchema>;

export const COMPLEXITIES = ['S', 'M', 'L', 'XL'] as const;
export const complexitySchema = z.enum(COMPLEXITIES);
export type Complexity = z.infer<typeof complexitySchema>;

/** Caracteres de la entrada que se muestran en el historial cuando aún no hay título. */
export const INPUT_EXCERPT_LENGTH = 120;

/** Una fila del historial (RF-HIS-01). No lleva la especificación: esa va en el detalle. */
export const generationSummarySchema = z.object({
  id: z.uuid(),
  type: generationTypeSchema,
  status: generationStatusSchema,
  /** El título lo pone la IA: no existe mientras se genera ni si la generación falla. */
  title: z.string().nullable(),
  /** Comienzo del texto que escribió el usuario. */
  inputExcerpt: z.string(),
  complexity: complexitySchema.nullable(),
  isEdited: z.boolean(),
  isSample: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type GenerationSummary = z.infer<typeof generationSummarySchema>;

/** Respuesta de `GET /projects/:id/generations`: una página, de más reciente a más antigua. */
export const generationPageResponseSchema = z.object({
  items: z.array(generationSummarySchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});
export type GenerationPageResponse = z.infer<typeof generationPageResponseSchema>;
