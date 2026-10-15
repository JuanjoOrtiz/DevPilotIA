import * as Sentry from '@sentry/node';
import type { BackgroundTasks } from '../../domain/providers/BackgroundTasks.js';
import type { ErrorReporter } from '../../domain/providers/ErrorReporter.js';

export interface SentryOptions {
  dsn: string;
  environment: string;
  release: string;
}

/**
 * RNF-16: a Sentry no llegan contraseñas, tokens, emails ni el texto de las generaciones.
 * Del evento se quitan el cuerpo, las cabeceras, las cookies y la consulta de la petición,
 * y del usuario queda solo su id.
 */
export function scrubEvent<Event extends Sentry.ErrorEvent>(event: Event): Event {
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.query_string;
    if (event.request.url) event.request.url = event.request.url.split('?')[0];
  }
  if (event.user) event.user = event.user.id ? { id: event.user.id } : {};
  delete event.extra;
  return event;
}

/** Los mensajes de consola pueden llevar datos de la petición: no viajan como migas de pan. */
export function keepBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb | null {
  return breadcrumb.category === 'console' ? null : breadcrumb;
}

/** Arranca Sentry. Solo se llama con un DSN: sin él, como en local y en los tests, no hay nada. */
export function initSentry(options: SentryOptions): void {
  Sentry.init({
    dsn: options.dsn,
    environment: options.environment,
    release: options.release,
    sendDefaultPii: false,
    // Solo errores: sin trazas de rendimiento, que agotarían la cuota gratuita.
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
    beforeBreadcrumb: keepBreadcrumb,
  });
}

/**
 * Envía a Sentry lo inesperado (RNF-15). En Vercel la función se congela al responder:
 * el envío se registra como trabajo pendiente para que no se pierda.
 */
export class SentryErrorReporter implements ErrorReporter {
  private readonly background: BackgroundTasks;

  constructor(background: BackgroundTasks) {
    this.background = background;
  }

  captureException(error: unknown, context: { userId?: string | null; route?: string } = {}) {
    Sentry.withScope((scope) => {
      if (context.userId) scope.setUser({ id: context.userId });
      if (context.route) scope.setTag('route', context.route);
      Sentry.captureException(error);
    });
    this.flush();
  }

  captureMessage(message: string, context: Record<string, string | null | undefined> = {}) {
    Sentry.withScope((scope) => {
      const { userId, ...tags } = context;
      if (userId) scope.setUser({ id: userId });
      for (const [key, value] of Object.entries(tags)) if (value) scope.setTag(key, value);
      Sentry.captureMessage(message, 'warning');
    });
    this.flush();
  }

  private flush(): void {
    this.background.run(async () => {
      await Sentry.flush(2000);
    });
  }
}
