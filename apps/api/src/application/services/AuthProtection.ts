import type { SecurityLog } from '../../domain/providers/SecurityLog.js';
import type { AttemptLimiter } from './AttemptLimiter.js';

/** Lo que protege la autenticación: el límite de intentos y el registro de eventos. */
export interface AuthProtection {
  limiter: AttemptLimiter;
  log: SecurityLog;
}

/** Desde dónde llega la petición. La IP la pone la capa HTTP. */
export interface RequestContext {
  ip?: string | null;
}
