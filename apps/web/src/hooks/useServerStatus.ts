import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '../services/healthService';

export type ServerState = 'checking' | 'waking' | 'up' | 'degraded' | 'unreachable';

export interface ServerStatus {
  state: ServerState;
  version: string | undefined;
  retry: () => void;
}

// El servidor gratuito tarda cerca de un minuto en despertar: 15 reintentos cada 5 s.
const RETRIES = 15;
const RETRY_DELAY_MS = 5000;

/**
 * Estado del servidor para la interfaz. Mientras la API no responde se muestra
 * «despertando el servidor», no un error; solo tras agotar los reintentos pasa a
 * «sin conexión».
 */
export function useServerStatus(): ServerStatus {
  const query = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => fetchHealth(signal),
    retry: RETRIES,
    retryDelay: RETRY_DELAY_MS,
    refetchOnWindowFocus: false,
  });

  return {
    state: toState(query),
    version: query.data?.version,
    retry: () => void query.refetch(),
  };
}

function toState(query: {
  isFetching: boolean;
  isSuccess: boolean;
  failureCount: number;
  data: { status: 'ok' | 'degraded' } | undefined;
}): ServerState {
  if (query.isFetching) return query.failureCount > 0 ? 'waking' : 'checking';
  if (query.isSuccess) return query.data?.status === 'ok' ? 'up' : 'degraded';
  return 'unreachable';
}
