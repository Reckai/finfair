import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query/queryKeys';
import { incomesApi } from '../services/incomes';
import { cacheGet, cacheSet } from '../db/cache';
import { CACHE_KEYS } from '../types/offline';
import { Income } from '../types';
import { useAppStore } from '../store/useAppStore';

export function useIncomes() {
  const isOnline = useAppStore((s) => s.isOnline);

  return useQuery<Income[]>({
    queryKey: queryKeys.incomes.all,
    queryFn: async () => {
      if (!isOnline) {
        const cached = cacheGet<Income[]>(CACHE_KEYS.INCOMES);
        if (cached) return cached.data;
        return [];
      }

      const data = await incomesApi.getAll();
      await cacheSet(CACHE_KEYS.INCOMES, data);
      return data;
    },
    initialData: () => {
      const cached = cacheGet<Income[]>(CACHE_KEYS.INCOMES);
      return cached?.data;
    },
    initialDataUpdatedAt: () => {
      const cached = cacheGet<Income[]>(CACHE_KEYS.INCOMES);
      return cached?.lastSync;
    },
  });
}
