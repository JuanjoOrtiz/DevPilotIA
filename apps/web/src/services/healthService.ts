import { healthResponseSchema, type HealthResponse } from '@devpilot/shared';
import { apiFetch } from './apiClient';

/**
 * Estado de la API. Un 503 con cuerpo válido significa que la API responde pero la base
 * de datos no. Cualquier otra respuesta (por ejemplo, una página de error del hosting)
 * se trata como «todavía no disponible».
 */
export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await apiFetch('/health', signal ? { signal } : {});
  const body: unknown = await response.json().catch(() => null);
  const health = healthResponseSchema.safeParse(body);

  if (!health.success) {
    throw new Error(`Unexpected health response (HTTP ${response.status})`);
  }
  return health.data;
}
