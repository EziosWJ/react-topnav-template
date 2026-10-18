import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { DashboardRange } from '../../types/entities';
import { queryKeys } from '../../lib/query/keys';
import { dashboardApi } from './api';

export function useDashboardSummary(range: DashboardRange) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(range),
    queryFn: () => dashboardApi.summary(range),
    placeholderData: keepPreviousData,
  });
}
