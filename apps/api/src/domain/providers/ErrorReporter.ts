/**
 * Monitorización de errores (RNF-15). Solo recibe lo inesperado: los errores esperados
 * (validación, 401, 404, límites) nunca llegan aquí. La implementación decide qué datos
 * salen hacia fuera (RNF-16).
 */
export interface ErrorReporter {
  captureException(error: unknown, context?: { userId?: string | null; route?: string }): void;
  /** Un aviso que no es una excepción, como la reutilización de un refresh token. */
  captureMessage(message: string, context?: Record<string, string | null | undefined>): void;
}
