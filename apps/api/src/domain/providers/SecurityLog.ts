/**
 * Eventos de seguridad (SEG-09). Llevan fecha, usuario e IP cuando se conocen, y nunca
 * contraseñas, tokens ni emails.
 */
export type SecurityEventType =
  'login_failed' | 'refresh_token_reuse' | 'access_denied' | 'limit_reached';

export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string | null;
  ip?: string | null;
  /** Qué límite o qué ruta, sin datos personales. */
  detail?: string;
}

export interface SecurityLog {
  record(event: SecurityEvent): void;
}
