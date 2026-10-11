import type { z } from 'zod';
import { DomainError } from '../../domain/errors/DomainError.js';

function parse<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
  message: string,
): z.infer<Schema> {
  const parsed = schema.safeParse(input ?? {});
  if (parsed.success) return parsed.data;

  const fields: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path.length > 0 ? issue.path.join('.') : '_';
    (fields[field] ??= []).push(issue.message);
  }
  throw new DomainError('VALIDATION_ERROR', message, { fields });
}

/**
 * Valida el cuerpo de una petición con un esquema de `packages/shared` (RNF-07).
 * Si no es válido lanza `VALIDATION_ERROR` con el motivo de cada campo en `details.fields`.
 */
export function parseBody<Schema extends z.ZodType>(
  schema: Schema,
  body: unknown,
): z.infer<Schema> {
  return parse(schema, body, 'Request body is not valid');
}

/** Lo mismo para los parámetros de la URL (`?page=2`), que llegan siempre como texto. */
export function parseQuery<Schema extends z.ZodType>(
  schema: Schema,
  query: unknown,
): z.infer<Schema> {
  return parse(schema, query, 'Query parameters are not valid');
}
