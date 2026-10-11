import { fieldErrorsSchema } from '@devpilot/shared';
import { ApiError, type ApiErrorCode } from '../../services/apiClient';

/** Por qué no se pudo enviar un formulario: el código del error y, si los hay, los campos. */
export interface SubmitFailure {
  code: ApiErrorCode;
  /** Motivos por campo, tal y como los devuelve la API en `details.fields`. */
  fields: Record<string, string[]>;
}

export function toSubmitFailure(error: unknown): SubmitFailure {
  if (!(error instanceof ApiError)) return { code: 'INTERNAL_ERROR', fields: {} };

  const details = fieldErrorsSchema.safeParse(error.details);
  return { code: error.code, fields: details.success ? details.data.fields : {} };
}
