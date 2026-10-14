import { useQuery } from '@tanstack/react-query';
import * as dashboardService from '../../services/dashboardService';

export const dashboardKeys = {
  summary: () => ['dashboard', 'summary'] as const,
};

/** RF-DAS-01 a 03. Se vuelve a pedir cada vez que se abre: las generaciones terminan solas. */
export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: ({ signal }) => dashboardService.getDashboardSummary(signal),
    refetchOnMount: 'always',
  });
}
