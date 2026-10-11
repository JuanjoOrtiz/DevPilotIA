import type { z } from 'zod';
import { DomainError } from '../../domain/errors/DomainError.js';

/**
 * Valida el cuerpo de una petición con un esquema de `packages/shared` (RNF-07).
 * Si no es válido lanza `VALIDATION_ERROR` con el motivo de cada campo en `details.fields`.
 */
export function parseBody<Schema extends z.ZodType>(
  schema: Schema,
  body: unknown,
): z.infer<Schema> {
  const parsed = schema.safeParse(body ?? {});
  if (parsed.success) return parsed.data;

  const fields: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path.length > 0 ? issue.path.join('.') : '_';
    (fields[field] ??= []).push(issue.message);
  }
  throw new DomainError('VALIDATION_ERROR', 'Request body is not valid', { fields });
}
