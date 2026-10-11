import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '../services/healthService';

export type ServerState = 'checking' | 'retrying' | 'up' | 'degraded' | 'unreachable';

export interface ServerStatus {
  state: ServerState;
  version: string | undefined;
  retry: () => void;
}

// Un arranque en frío de la API tarda unos segundos: 4 reintentos cada 3 s lo cubren.
const RETRIES = 4;
const RETRY_DELAY_MS = 3000;

/**
 * Estado del servidor para la interfaz. Si la API no responde a la primera se muestra
 * «reintentando», no un error; solo tras agotar los reintentos pasa a «sin conexión».
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
  if (query.isFetching) return query.failureCount > 0 ? 'retrying' : 'checking';
  if (query.isSuccess) return query.data?.status === 'ok' ? 'up' : 'degraded';
  return 'unreachable';
}
