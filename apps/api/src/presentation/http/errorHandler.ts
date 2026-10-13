import type { ApiError, ErrorCode } from '@devpilot/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { DomainError } from '../../domain/errors/DomainError.js';

const STATUS_BY_CODE: Partial<Record<ErrorCode, number>> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  NOT_FOUND: 404,
  EMAIL_ALREADY_REGISTERED: 409,
  GENERATION_NOT_AWAITING_ANSWERS: 409,
  USER_QUOTA_EXCEEDED: 429,
  GLOBAL_QUOTA_EXCEEDED: 429,
};

function body(code: ErrorCode, message: string, details: Record<string, unknown> = {}): ApiError {
  return { error: { code, message, details } };
}

/** Errores que lanza el lector de JSON de Express antes de llegar a un controlador. */
function bodyParserFailure(error: unknown): { status: number; message: string } | undefined {
  if (typeof error !== 'object' || error === null || !('type' in error)) return undefined;
  if (error.type === 'entity.too.large') {
    return { status: 413, message: 'Request body is too large' };
  }
  if (error.type === 'entity.parse.failed') {
    return { status: 400, message: 'Request body is not valid JSON' };
  }
  return undefined;
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json(body('NOT_FOUND', 'Resource not found'));
};

/**
 * Convierte cualquier error en el formato único de la API. Un error inesperado sale como
 * un 500 genérico: el detalle va al registro, nunca a la respuesta (SEG-10).
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof DomainError) {
    const status = STATUS_BY_CODE[error.code] ?? 500;
    res.status(status).json(body(error.code, error.message, error.details));
    return;
  }

  const parserFailure = bodyParserFailure(error);
  if (parserFailure) {
    res.status(parserFailure.status).json(body('VALIDATION_ERROR', parserFailure.message));
    return;
  }

  console.error('Unexpected error', error);
  res.status(500).json(body('INTERNAL_ERROR', 'Internal server error'));
};
