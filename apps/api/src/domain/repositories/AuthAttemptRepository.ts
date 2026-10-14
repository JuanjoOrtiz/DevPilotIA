/** Qué se limita: los logins fallidos o los registros. */
export type AttemptScope = 'login' | 'register';

/**
 * Intentos de autenticación recientes (RNF-04). Vive en la base de datos y no en memoria:
 * en Vercel cada petición puede llegar a una instancia distinta.
 */
export interface AuthAttemptRepository {
  record(scope: AttemptScope, key: string, at: Date): Promise<void>;
  countSince(scope: AttemptScope, key: string, since: Date): Promise<number>;
  /** El intento más antiguo que sigue contando, para saber cuándo vuelve a haber cupo. */
  oldestSince(scope: AttemptScope, key: string, since: Date): Promise<Date | null>;
  /** Olvida los intentos de una clave: un login correcto pone a cero su email. */
  clear(scope: AttemptScope, key: string): Promise<void>;
}
