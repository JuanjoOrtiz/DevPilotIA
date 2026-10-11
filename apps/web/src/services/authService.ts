import {
  currentUserResponseSchema,
  sessionResponseSchema,
  type LoginRequest,
  type RegisterRequest,
  type SessionResponse,
  type User,
} from '@devpilot/shared';
import { apiRequest, renewSession, setAccessToken } from './apiClient';

async function startSession(path: string, body: unknown): Promise<User> {
  const session = await apiRequest(path, { method: 'POST', body, schema: sessionResponseSchema });
  setAccessToken(session.accessToken);
  return session.user;
}

/** RF-AUT-01: crea la cuenta; la sesión queda iniciada. */
export function register(input: RegisterRequest): Promise<User> {
  return startSession('/auth/register', input);
}

/** RF-AUT-02. */
export function login(input: LoginRequest): Promise<User> {
  return startSession('/auth/login', input);
}

/** Recupera la sesión al cargar la página, a partir de la cookie de refresh. */
export async function restoreSession(): Promise<User | null> {
  const session: SessionResponse | null = await renewSession();
  return session?.user ?? null;
}

/** RF-AUT-04: el servidor invalida el refresh token; aquí se olvida el access token. */
export async function logout(): Promise<void> {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } finally {
    // Pase lo que pase con la petición, esta pestaña deja de tener sesión.
    setAccessToken(null);
  }
}

export async function fetchCurrentUser(signal?: AbortSignal): Promise<User> {
  const { user } = await apiRequest('/auth/me', {
    schema: currentUserResponseSchema,
    ...(signal ? { signal } : {}),
  });
  return user;
}
