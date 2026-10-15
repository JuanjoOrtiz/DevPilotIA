import {
  dashboardResponseSchema,
  type DashboardQuery,
  type DashboardSummary,
} from '@devpilot/shared';
import { apiRequest } from './apiClient';

/** RF-DAS-01 a 04 y 06: indicadores y series del dashboard, del periodo y proyecto elegidos. */
export async function getDashboardSummary(
  filter: DashboardQuery = {},
  signal?: AbortSignal,
): Promise<DashboardSummary> {
  const query = new URLSearchParams();
  if (filter.days !== undefined) query.set('days', String(filter.days));
  if (filter.projectId) query.set('projectId', filter.projectId);
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  const { summary } = await apiRequest(`/dashboard/summary${suffix}`, {
    schema: dashboardResponseSchema,
    ...(signal ? { signal } : {}),
  });
  return summary;
}
