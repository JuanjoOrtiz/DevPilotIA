import { dashboardResponseSchema, type DashboardSummary } from '@devpilot/shared';
import { apiRequest } from './apiClient';

/** RF-DAS-01 a 03: indicadores y series del dashboard del usuario en sesión. */
export async function getDashboardSummary(signal?: AbortSignal): Promise<DashboardSummary> {
  const { summary } = await apiRequest('/dashboard/summary', {
    schema: dashboardResponseSchema,
    ...(signal ? { signal } : {}),
  });
  return summary;
}
