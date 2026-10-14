import { z } from 'zod';

/**
 * Códigos de error de la API. El frontend traduce el mensaje a partir del código,
 * así que añadir uno aquí obliga a añadir su texto en los ficheros de traducción.
 */
export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'INVALID_CREDENTIALS',
  'EMAIL_ALREADY_REGISTERED',
  'NOT_FOUND',
  'GENERATION_NOT_AWAITING_ANSWERS',
  'SPECIFICATION_NOT_READY',
  'USER_QUOTA_EXCEEDED',
  'GLOBAL_QUOTA_EXCEEDED',
  'TOO_MANY_ATTEMPTS',
  'LLM_RATE_LIMITED',
  'LLM_TIMEOUT',
  'LLM_INVALID_RESPONSE',
  'LLM_CONTENT_BLOCKED',
  'LLM_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;

export const errorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

/** Formato único de error de la API: `{ "error": { code, message, details } }`. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.record(z.string(), z.unknown()),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
