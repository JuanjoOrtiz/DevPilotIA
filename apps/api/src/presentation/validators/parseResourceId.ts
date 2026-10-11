import { z } from 'zod';
import { DomainError } from '../../domain/errors/DomainError.js';

const idSchema = z.uuid();

/**
 * Id de un recurso leído de la URL. Uno que no es un UUID no puede existir, así que
 * responde 404 como cualquier otro id desconocido, sin llegar a la base de datos.
 */
export function parseResourceId(value: unknown): string {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) throw new DomainError('NOT_FOUND', 'Resource not found');
  return parsed.data.toLowerCase();
}
