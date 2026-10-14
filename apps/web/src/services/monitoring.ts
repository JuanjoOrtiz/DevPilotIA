import * as Sentry from '@sentry/react';
import { ApiError } from './apiClient';

/**
 * RNF-15: Sentry en el navegador. Sin `VITE_SENTRY_DSN`, como en local y en los tests,
 * queda desactivado y no se carga nada.
 */
export function initMonitoring(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION,
    sendDefaultPii: false,
    // RNF-16: sin Session Replay ni trazas de rendimiento.
    integrations: [],
    tracesSampleRate: 0,
    beforeSend: scrubWebEvent,
    beforeBreadcrumb: (breadcrumb) =>
      breadcrumb.category === 'console' || breadcrumb.category === 'ui.input' ? null : breadcrumb,
  });
}

/** Los errores esperados (validación, 401, 404, límites) no se envían: no son fallos. */
function isExpected(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 0 || error.status < 500);
}

/**
 * RNF-16: a Sentry no llegan contraseñas, tokens, emails ni lo que escribe el usuario:
 * fuera la consulta de la URL, las cabeceras y cualquier dato del usuario salvo su id.
 */
export function scrubWebEvent(
  event: Sentry.ErrorEvent,
  hint: Sentry.EventHint,
): Sentry.ErrorEvent | null {
  if (isExpected(hint.originalException)) return null;
  if (event.request) {
    delete event.request.headers;
    delete event.request.cookies;
    delete event.request.query_string;
    if (event.request.url) event.request.url = event.request.url.split('?')[0];
  }
  if (event.user) event.user = event.user.id ? { id: event.user.id } : {};
  delete event.extra;
  return event;
}

/** El usuario en sesión, identificado solo por su id. */
export function setMonitoringUser(userId: string | null): void {
  Sentry.setUser(userId ? { id: userId } : null);
}
