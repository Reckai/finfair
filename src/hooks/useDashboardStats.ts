import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query/queryKeys';
import { dashboardApi } from '../services/dashboard';
import { cacheGet, cacheSet } from '../db/cache';
import { CACHE_KEYS } from '../types/offline';
import { ApiDashboardStats } from '../types/api';
import { useAppStore } from '../store/useAppStore';

export function useDashboardStats() {
  const isOnline = useAppStore((s) => s.isOnline);

  return useQuery<ApiDashboardStats | null>({
    queryKey: queryKeys.dashboard.stats,
    queryFn: async () => {
      if (!isOnline) {
        const cached = cacheGet<ApiDashboardStats>(CACHE_KEYS.DASHBOARD_STATS);
        if (cached) return cached.data;
        return null;
      }

      const data = await dashboardApi.getStats();
      if (data) {
        cacheSet(CACHE_KEYS.DASHBOARD_STATS, data);
      }
      return data;
    },
    initialData: () => {
      const cached = cacheGet<ApiDashboardStats>(CACHE_KEYS.DASHBOARD_STATS);
      return cached?.data ?? undefined;
    },
    initialDataUpdatedAt: () => {
      const cached = cacheGet<ApiDashboardStats>(CACHE_KEYS.DASHBOARD_STATS);
      return cached?.lastSync;
    },
  });
}
