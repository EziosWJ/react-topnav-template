import { apiClient, unwrap } from '../../lib/api/client';
import type { DashboardRange, DashboardSummary } from '../../types/entities';

export const dashboardApi = {
  summary(range: DashboardRange) {
    return unwrap(apiClient.get<DashboardSummary>('/dashboard/summary', { params: { range } }));
  },
};
