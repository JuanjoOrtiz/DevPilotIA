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

/**
 * De lo que la API ha rechazado, el primer motivo de cada campo del formulario.
 * Un elemento de una lista (`techStack.2`) cuenta como su campo (`techStack`).
 */
export function rejectedFields<Field extends string>(
  failure: SubmitFailure,
  fields: readonly Field[],
): { field: Field; reason: string }[] {
  return fields.flatMap((field) => {
    const path = Object.keys(failure.fields).find(
      (candidate) => candidate === field || candidate.startsWith(`${field}.`),
    );
    const reason = path === undefined ? undefined : failure.fields[path]?.[0];
    return reason === undefined ? [] : [{ field, reason }];
  });
}
