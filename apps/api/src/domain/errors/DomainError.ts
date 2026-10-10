import type { ErrorCode } from '@devpilot/shared';

/**
 * Error de negocio con un código estable. La capa de presentación lo convierte en
 * una respuesta HTTP y el frontend traduce el mensaje a partir del código.
 */
export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
  }
}
