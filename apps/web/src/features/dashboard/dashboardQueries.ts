import type { DashboardQuery } from '@devpilot/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import * as dashboardService from '../../services/dashboardService';

/** Claves de caché. Invalidar `summary()` invalida el dashboard con cualquier filtro. */
export const dashboardKeys = {
  summary: () => ['dashboard', 'summary'] as const,
  filtered: (filter: DashboardQuery) => [...dashboardKeys.summary(), filter] as const,
};

/**
 * RF-DAS-01 a 06. Se vuelve a pedir cada vez que se abre: las generaciones terminan solas.
 * Al cambiar de filtro se siguen viendo los datos anteriores hasta que llegan los nuevos.
 */
export function useDashboardSummary(filter: DashboardQuery = {}) {
  return useQuery({
    queryKey: dashboardKeys.filtered(filter),
    queryFn: ({ signal }) => dashboardService.getDashboardSummary(filter, signal),
    refetchOnMount: 'always',
    placeholderData: keepPreviousData,
  });
}
