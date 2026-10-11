import {
  apiErrorSchema,
  sessionResponseSchema,
  type ErrorCode,
  type SessionResponse,
} from '@devpilot/shared';
import type { z } from 'zod';

/** Todas las llamadas a la API pasan por aquí. La ruta es relativa: mismo origen que la web. */
const API_BASE = '/api/v1';

/** Además de los códigos de la API, los dos fallos que solo ve el navegador. */
export type ApiErrorCode = ErrorCode | 'NETWORK_ERROR' | 'UNEXPECTED_RESPONSE';

/** Una petición a la API que no ha salido bien, con el código que el frontend traduce. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown>;

  constructor(code: ApiErrorCode, status = 0, details: Record<string, unknown> = {}) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// RF-AUT-03: el access token vive solo aquí, en memoria. Nunca en localStorage (T-24).
let accessToken: string | null = null;
let renewal: Promise<SessionResponse | null> | null = null;
const expiryListeners = new Set<() => void>();

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Avisa cuando la sesión deja de valer en mitad de una petición. Devuelve cómo darse de baja. */
export function onSessionExpired(listener: () => void): () => void {
  expiryListeners.add(listener);
  return () => expiryListeners.delete(listener);
}

function headers(init: RequestInit, withBody: boolean): Headers {
  const result = new Headers(init.headers);
  result.set('Accept', 'application/json');
  if (withBody) result.set('Content-Type', 'application/json');
  if (accessToken) result.set('Authorization', `Bearer ${accessToken}`);
  return result;
}

/** Petición sin interpretar, para quien necesita mirar la respuesta tal cual. */
export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, { ...init, headers: headers(init, init.body != null) });
}

async function toApiError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null);
  const parsed = apiErrorSchema.safeParse(body);
  if (!parsed.success) return new ApiError('UNEXPECTED_RESPONSE', response.status);
  return new ApiError(parsed.data.error.code, response.status, parsed.data.error.details);
}

async function send(path: string, init: RequestInit): Promise<Response> {
  try {
    return await apiFetch(path, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('NETWORK_ERROR');
  }
}

async function requestNewSession(): Promise<SessionResponse | null> {
  const response = await send('/auth/refresh', { method: 'POST' });
  if (response.status === 401) {
    accessToken = null;
    return null;
  }
  if (!response.ok) throw await toApiError(response);

  const session = sessionResponseSchema.safeParse(await response.json().catch(() => null));
  if (!session.success) throw new ApiError('UNEXPECTED_RESPONSE', response.status);

  accessToken = session.data.accessToken;
  return session.data;
}

/**
 * Cambia la cookie de refresh por una sesión nueva. Devuelve `null` si no hay sesión.
 *
 * Cada refresh token vale una sola vez, así que nunca salen dos renovaciones a la vez:
 * dentro de la pestaña comparten una misma petición y, entre pestañas, esperan su turno
 * con un bloqueo del navegador. Sin esto, la API tomaría la segunda por un robo.
 */
export function renewSession(): Promise<SessionResponse | null> {
  renewal ??= withTabLock(requestNewSession).finally(() => {
    renewal = null;
  });
  return renewal;
}

function withTabLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  return locks ? (locks.request('devpilot-session-renewal', task) as Promise<T>) : task();
}

interface RequestOptions<Schema extends z.ZodType | undefined> {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Esquema de la respuesta. Sin él, la respuesta se ignora (por ejemplo, un 204). */
  schema?: Schema;
  signal?: AbortSignal;
}

type Result<Schema> = Schema extends z.ZodType ? z.infer<Schema> : undefined;

/**
 * Petición a la API con la respuesta validada. Si el access token ha caducado, renueva
 * la sesión y repite la petición una vez, sin que quien llama se entere (RF-AUT-03).
 */
export async function apiRequest<Schema extends z.ZodType | undefined = undefined>(
  path: string,
  options: RequestOptions<Schema> = {},
): Promise<Result<Schema>> {
  const init: RequestInit = { method: options.method ?? 'GET' };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);
  if (options.signal) init.signal = options.signal;

  let response = await send(path, init);

  if (response.status === 401 && accessToken !== null) {
    const session = await renewSession();
    if (!session) {
      for (const listener of expiryListeners) listener();
      throw new ApiError('UNAUTHORIZED', 401);
    }
    response = await send(path, init);
  }

  if (!response.ok) throw await toApiError(response);
  if (!options.schema) return undefined as Result<Schema>;

  const parsed = options.schema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new ApiError('UNEXPECTED_RESPONSE', response.status);
  return parsed.data as Result<Schema>;
}

/** Solo para tests: deja el módulo como recién cargado. */
export function resetApiClient(): void {
  accessToken = null;
  renewal = null;
  expiryListeners.clear();
}
