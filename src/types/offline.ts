export type EntityType = 'transaction' | 'settlement' | 'income';

export type OutboxAction = 'create' | 'update' | 'delete';

export interface OutboxEntry {
  id: string;
  entityType: EntityType;
  action: OutboxAction;
  payload: string; // JSON string of the entity data
  tempId?: string | null;
  entityId?: string | null;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'failed';
}
export const CACHE_KEYS = {
  TRANSACTIONS: 'transactions',
  TRANSACTIONS_PAIR: 'transactions_pair',
  SETTLEMENTS: 'settlements',
  DASHBOARD_STATS: 'dashboard_stats',
  INCOMES: 'incomes',
};
export type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS];

export interface CacheEntry {
  key: CacheKey;
  data: string;
  lastSync: number;
}
