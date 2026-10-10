/** Todas las llamadas a la API pasan por aquí. La ruta es relativa: mismo origen que la web. */
const API_BASE = '/api/v1';

export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...init.headers },
  });
}
