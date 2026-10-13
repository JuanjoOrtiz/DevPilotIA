import { z } from 'zod';

/**
 * Motivos por los que un campo no es válido. La API los devuelve en `details.fields`
 * y el frontend los traduce: aquí no hay ningún texto para el usuario.
 */
export const FIELD_ERRORS = [
  'NAME_REQUIRED',
  'NAME_TOO_LONG',
  'EMAIL_INVALID',
  'PASSWORD_REQUIRED',
  'PASSWORD_TOO_SHORT',
  'PASSWORD_TOO_LONG',
  'PROJECT_NAME_REQUIRED',
  'PROJECT_NAME_TOO_LONG',
  'DESCRIPTION_TOO_LONG',
  'CONVENTIONS_TOO_LONG',
  'TOO_MANY_TAGS',
  'TAG_EMPTY',
  'TAG_TOO_LONG',
  'PAGE_INVALID',
  'PAGE_SIZE_INVALID',
  'GENERATION_TYPE_INVALID',
  'INPUT_TOO_SHORT',
  'INPUT_TOO_LONG',
  'CONTEXT_TOO_LONG',
  'ANSWER_TOO_LONG',
  'ANSWER_UNKNOWN_QUESTION',
  'ANSWERS_INVALID',
] as const;
export type FieldError = (typeof FIELD_ERRORS)[number];

/** Comprueba al compilar que el mensaje de un esquema es uno de los motivos conocidos. */
export const fieldError = (code: FieldError): FieldError => code;

/** Forma de `details` en un `VALIDATION_ERROR` causado por el cuerpo de la petición. */
export const fieldErrorsSchema = z.object({
  fields: z.record(z.string(), z.array(z.string())),
});
export type FieldErrors = z.infer<typeof fieldErrorsSchema>;

/** Paginación por número de página, común a todas las listas largas. */
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

/** Parámetros `page` y `pageSize` de una lista paginada. Llegan como texto en la URL. */
export const pageQuerySchema = z.object({
  page: z.coerce
    .number(fieldError('PAGE_INVALID'))
    .int(fieldError('PAGE_INVALID'))
    .min(1, fieldError('PAGE_INVALID'))
    .default(1),
  pageSize: z.coerce
    .number(fieldError('PAGE_SIZE_INVALID'))
    .int(fieldError('PAGE_SIZE_INVALID'))
    .min(1, fieldError('PAGE_SIZE_INVALID'))
    .max(MAX_PAGE_SIZE, fieldError('PAGE_SIZE_INVALID'))
    .default(DEFAULT_PAGE_SIZE),
});
export type PageQuery = z.infer<typeof pageQuerySchema>;
