import type { ErrorReporter } from '../../domain/providers/ErrorReporter.js';
import type { Clock } from '../../domain/providers/Clock.js';
import type { SecurityEvent, SecurityLog } from '../../domain/providers/SecurityLog.js';

/**
 * SEG-09: una línea JSON por evento en la salida de la función, que Vercel guarda en sus
 * logs. Avisan además en Sentry la reutilización de un refresh token, señal de robo, y
 * el bloqueo de logins por demasiados fallos, que es un pico de intentos (fuerza bruta o
 * relleno de credenciales).
 */
export class ConsoleSecurityLog implements SecurityLog {
  private readonly clock: Clock;
  private readonly reporter: ErrorReporter | undefined;
  private readonly write: (line: string) => void;

  constructor(
    clock: Clock,
    reporter?: ErrorReporter,
    write = (line: string) => console.warn(line),
  ) {
    this.clock = clock;
    this.reporter = reporter;
    this.write = write;
  }

  record(event: SecurityEvent): void {
    this.write(
      JSON.stringify({
        kind: 'security',
        event: event.type,
        at: this.clock.now().toISOString(),
        userId: event.userId ?? null,
        ip: event.ip ?? null,
        ...(event.detail && { detail: event.detail }),
      }),
    );
    if (event.type === 'refresh_token_reuse') {
      this.reporter?.captureMessage('Refresh token reuse', { userId: event.userId ?? null });
    }
    if (event.type === 'limit_reached' && event.detail?.startsWith('login:')) {
      this.reporter?.captureMessage('Login attempts limit reached', { detail: event.detail });
    }
  }
}
