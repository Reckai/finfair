import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query/queryKeys';
import { transactionsApi } from '../services/transactions';
import { cacheGet, cacheSet } from '../db/cache';
import { CACHE_KEYS } from '../types/offline';
import { Transaction } from '../types';
import { useAppStore } from '../store/useAppStore';

export function useTransactions() {
  const pairId = useAppStore((s) => s.pairId);
  const isOnline = useAppStore((s) => s.isOnline);

  const queryKey = pairId ? queryKeys.transactions.pair : queryKeys.transactions.all;
  const cacheKey = pairId ? CACHE_KEYS.TRANSACTIONS_PAIR : CACHE_KEYS.TRANSACTIONS;

  return useQuery<Transaction[]>({
    queryKey,
    queryFn: async () => {
      if (!isOnline) {
        const cached = cacheGet<Transaction[]>(cacheKey);
        if (cached) return cached.data;
        return [];
      }

      const data = pairId ? await transactionsApi.getAllPair() : await transactionsApi.getAll();
      await cacheSet(cacheKey, data);
      return data;
    },
    initialData: () => {
      const cached = cacheGet<Transaction[]>(cacheKey);
      return cached?.data;
    },
    initialDataUpdatedAt: () => {
      const cached = cacheGet<Transaction[]>(cacheKey);
      return cached?.lastSync;
    },
  });
}
