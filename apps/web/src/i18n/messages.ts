import { ERROR_CODES, FIELD_ERRORS, type FieldError } from '@devpilot/shared';
import { ApiError, type ApiErrorCode } from '../services/apiClient';

/** Motivos de error de un campo que tienen texto propio. */
type FieldMessage = FieldError | 'EMAIL_ALREADY_REGISTERED' | 'INVALID';

const FIELD_MESSAGES: readonly string[] = [...FIELD_ERRORS, 'EMAIL_ALREADY_REGISTERED'];
const ERROR_MESSAGES: readonly string[] = [...ERROR_CODES, 'NETWORK_ERROR', 'UNEXPECTED_RESPONSE'];

/**
 * Clave de traducción para el motivo de error de un campo. Un motivo que el frontend
 * todavía no conoce se muestra con un texto genérico, nunca con el código en crudo.
 */
export function fieldMessageKey(reason: string | undefined): `validation.${FieldMessage}` {
  const known = reason !== undefined && FIELD_MESSAGES.includes(reason);
  return `validation.${known ? (reason as FieldMessage) : 'INVALID'}`;
}

/** Clave de traducción para un error de la API, a partir de su código (RNF-14). */
export function errorMessageKey(code: string): `errors.${ApiErrorCode}` {
  return `errors.${ERROR_MESSAGES.includes(code) ? (code as ApiErrorCode) : 'INTERNAL_ERROR'}`;
}

/** Clave de traducción para lo que ha fallado al pedir datos: casi siempre, un error de la API. */
export function queryErrorKey(error: unknown): `errors.${ApiErrorCode}` {
  return errorMessageKey(error instanceof ApiError ? error.code : 'INTERNAL_ERROR');
}

/** El recurso no existe o es de otra persona: la API no distingue un caso del otro. */
export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'NOT_FOUND';
}
