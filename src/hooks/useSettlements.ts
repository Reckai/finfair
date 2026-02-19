import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query/queryKeys';
import { settlementsApi } from '../services/settlements';
import { cacheGet, cacheSet } from '../db/cache';
import { CACHE_KEYS } from '../types/offline';
import { Settlement } from '../types';
import { useAppStore } from '../store/useAppStore';

export function useSettlements() {
  const isOnline = useAppStore((s) => s.isOnline);
  return useQuery<Settlement[]>({
    queryKey: queryKeys.settlements.all,
    queryFn: async () => {
      if (!isOnline) {
        const cached = await cacheGet<Settlement[]>(CACHE_KEYS.SETTLEMENTS);
        if (cached) return cached.data;
        return [];
      }

      const data = await settlementsApi.getAll();
      cacheSet(CACHE_KEYS.SETTLEMENTS, data);
      return data;
    },
    initialData: () => {
      const cached = cacheGet<Settlement[]>(CACHE_KEYS.SETTLEMENTS);
      return cached?.data;
    },
    initialDataUpdatedAt: () => {
      const cached = cacheGet<Settlement[]>(CACHE_KEYS.SETTLEMENTS);
      return cached?.lastSync;
    },
  });
}
