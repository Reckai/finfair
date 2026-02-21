import { outboxGetPending, outboxIncrementRetry, outboxRemove, outboxPendingCount } from '../db/outbox';
import { settlementsApi } from '../services/settlements';
import { transactionsApi } from '../services/transactions';
import { useAppStore } from '../store/useAppStore';
import { CACHE_KEYS, OutboxEntry } from '../types/offline';
import { dashboardApi } from '../services/dashboard';
import { cacheSet } from '../db/cache';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query/queryKeys';

export async function drainOutbox() {
  const entries = outboxGetPending();
  for (const entry of entries) {
    try {
      processOutBoxEntry(entry);
      outboxRemove(entry.id);
    } catch (error) {
      console.warn(`Outbox entry ${entry.id} failed`, error);
      outboxIncrementRetry(entry.id);
    }
  }
}

async function processOutBoxEntry(entry: OutboxEntry): Promise<void> {
  const payload = JSON.parse(entry.payload);
  switch (entry.entityType) {
    case 'transaction': {
      switch (entry.action) {
        case 'create': {
          const result = await transactionsApi.create(payload);
          if (!result) throw new Error('Server rejected transaction create');
          break;
        }
        case 'update': {
          const result = await transactionsApi.update(entry.id, payload);
          if (!result) throw new Error('Server rejected transaction update');
          break;
        }
        case 'delete': {
          if (!entry.entityId) throw new Error('Missing entityId for transaction delete');
          const result = await transactionsApi.remove(entry.entityId);
          if (!result) throw new Error('Server rejected transaction delete');
          break;
        }
      }
    }
    case 'settlement':
      {
        switch (entry.action) {
          case 'create': {
            const result = await settlementsApi.create(payload);
            if (!result) throw new Error('Server rejected settlement create');
            break;
          }
          case 'delete': {
            if (!entry.entityId) throw new Error('Missing entityId for settlement delete');
            const success = await settlementsApi.remove(entry.entityId);
            if (!success) throw new Error('Server rejected settlement delete');
            break;
          }
        }
      }
      break;
  }
}

export async function refreshServerData() {
  const pairId = useAppStore.getState().pairId;
  const [transactionsResult, transactions_pairResult, settlementsResult, dashboardResult] =
    await Promise.allSettled([
      transactionsApi.getAll(),
      pairId ? transactionsApi.getAllPair() : Promise.resolve([]),
      settlementsApi.getAll(),
      dashboardApi.getStats(),
    ]);
  if (transactionsResult.status === 'fulfilled') {
    const transactions = transactionsResult.value;
    if (transactions) {
      cacheSet(CACHE_KEYS.TRANSACTIONS, transactions);
    }
  }
  if (transactions_pairResult.status === 'fulfilled') {
    const transactions_pair = transactions_pairResult.value;
    cacheSet(CACHE_KEYS.TRANSACTIONS_PAIR, transactions_pair);
  }
  if (settlementsResult.status === 'fulfilled') {
    cacheSet(CACHE_KEYS.SETTLEMENTS, settlementsResult.value);
  }
  if (dashboardResult.status === 'fulfilled' && dashboardResult.value) {
    cacheSet(CACHE_KEYS.DASHBOARD_STATS, dashboardResult.value);
  }
}
let isSyncing = false;
export async function performSync(queryClient: QueryClient) {
  if (isSyncing) return;
  isSyncing = true;
  try {
    await drainOutbox();
    useAppStore.getState().setPendingOutboxCount(outboxPendingCount());

    await refreshServerData();

    await queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.transactions.pair });
    await queryClient.invalidateQueries({ queryKey: queryKeys.settlements.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
  } catch (error) {
    console.error('Sync failed:', error);
  } finally {
    isSyncing = false;
  }
}
