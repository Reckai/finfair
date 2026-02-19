# Offline Mode: Server Cache + Outbox — Полный план реализации

## Context

FinFair — online-only приложение. Без интернета ничего не работает: нельзя добавить транзакцию, посмотреть историю, Dashboard пустой. Нужен offline mode по модели **Server Cache + Outbox**: сервер остаётся единственным source of truth, SQLite — кеш + очередь операций. Telegram-бот и backend **не меняются**.

```
Архитектура:

UI → React Query hooks → {
  Online:  API services (existing) → Server (source of truth)
  Offline: SQLite cache (read) + Outbox (write)
}

Sync Engine (при восстановлении связи):
  1. Drain outbox → POST/PUT/DELETE на сервер
  2. Fetch fresh data → Update SQLite cache
  3. Invalidate React Query → UI обновляется

Telegram Bot → API → Server (без змін!)
```

### Решения
- **Scope**: Transactions + Settlements — оба через outbox
- **State management**: Гибрид — React Query для server state, Zustand для client state (user, pairId, categories, settings)
- **SQLite**: Modern expo-sqlite API (синхронный, Expo 54+)
- **Конфликты**: Last-write-wins (сервер решает)

---

## Фаза 1: Зависимости и типы

### 1.1 Установка пакетов

```bash
npm install @tanstack/react-query expo-sqlite @react-native-community/netinfo uuid
npm install --save-dev @types/uuid
```

### 1.2 Новый файл: `src/types/offline.ts`

```typescript
// --- Outbox entry types ---
export type EntityType = 'transaction' | 'settlement';
export type OutboxAction = 'create' | 'update' | 'delete';

export interface OutboxEntry {
  id: string;               // UUID, generated client-side
  entityType: EntityType;
  action: OutboxAction;
  payload: string;           // JSON-serialized payload
  tempId: string | null;     // Для create: temp UUID для optimistic update; null для update/delete
  entityId: string | null;   // Для update/delete: серверный ID; null для create
  timestamp: number;         // Date.now()
  retryCount: number;
  status: 'pending' | 'failed'; // 'failed' после превышения max retries
}

// --- Cache key constants ---
export const CACHE_KEYS = {
  TRANSACTIONS: 'transactions',
  TRANSACTIONS_PAIR: 'transactions_pair',
  SETTLEMENTS: 'settlements',
  DASHBOARD_STATS: 'dashboard_stats',
} as const;

export type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS];

export interface CacheEntry {
  key: CacheKey;
  data: string;             // JSON-serialized
  lastSync: number;         // Date.now() последней успешной синхронизации
}
```

### 1.3 Изменить: `src/types/index.ts`

Добавить `_pendingOutboxId?` в `Transaction` и `Settlement` — маркер неотправленных записей:

```typescript
// Transaction — добавить поле:
export interface Transaction {
  id: string;
  amount: number;
  categoryId: number;
  description?: string;
  splitMode: SplitMode;
  source?: 'APP' | 'TELEGRAM';
  userId: string;
  pairId?: string;
  createdAt: string;
  category?: Category;
  _pendingOutboxId?: string;  // <-- НОВОЕ: присутствует когда создано offline
}

// Settlement — добавить поле:
export interface Settlement {
  id: string;
  amount: number;
  payerId: string;
  payeeId: string;
  pairId: string;
  description?: string;
  createdAt: string;
  _pendingOutboxId?: string;  // <-- НОВОЕ
}
```

---

## Фаза 2: SQLite слой

### 2.1 Новый файл: `src/db/database.ts`

```typescript
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('finfair.db');
    initDatabase(db);
  }
  return db;
}

function initDatabase(database: SQLite.SQLiteDatabase): void {
  database.execSync(`
    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY NOT NULL,
      entity_type TEXT NOT NULL,
      action TEXT NOT NULL,
      payload TEXT NOT NULL,
      temp_id TEXT,
      entity_id TEXT,
      timestamp INTEGER NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY NOT NULL,
      data TEXT NOT NULL,
      last_sync INTEGER NOT NULL
    );
  `);
}

export function closeDatabase(): void {
  if (db) {
    db.closeSync();
    db = null;
  }
}
```

**Ключевые решения:**
- `openDatabaseSync` — modern Expo 54 API, синхронные операции
- Lazy singleton через `getDatabase()`
- `execSync` для DDL — таблицы создаются до любых read/write

### 2.2 Новый файл: `src/db/outbox.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './database';
import { OutboxEntry, EntityType, OutboxAction } from '../types/offline';

const MAX_RETRIES = 3;

/** Добавить запись в outbox. Возвращает outbox entry ID. */
export function outboxPush(params: {
  entityType: EntityType;
  action: OutboxAction;
  payload: object;
  tempId?: string;
  entityId?: string;
}): string {
  const db = getDatabase();

  // Оптимизация: delete отменяет pending create
  if (params.action === 'delete' && params.entityId) {
    const pendingCreate = db.getFirstSync<{ id: string }>(
      `SELECT id FROM outbox WHERE temp_id = ? AND action = 'create' AND status = 'pending'`,
      [params.entityId]
    );
    if (pendingCreate) {
      db.runSync(`DELETE FROM outbox WHERE id = ?`, [pendingCreate.id]);
      return ''; // Обе операции отменяют друг друга
    }
  }

  // Оптимизация: update мержится в pending create
  if (params.action === 'update' && params.entityId) {
    const pendingCreate = db.getFirstSync<{ id: string; payload: string }>(
      `SELECT id, payload FROM outbox WHERE temp_id = ? AND action = 'create' AND status = 'pending'`,
      [params.entityId]
    );
    if (pendingCreate) {
      const existingPayload = JSON.parse(pendingCreate.payload);
      const mergedPayload = { ...existingPayload, ...params.payload };
      db.runSync(`UPDATE outbox SET payload = ? WHERE id = ?`, [
        JSON.stringify(mergedPayload),
        pendingCreate.id,
      ]);
      return pendingCreate.id;
    }
  }

  const id = uuidv4();
  const now = Date.now();

  db.runSync(
    `INSERT INTO outbox (id, entity_type, action, payload, temp_id, entity_id, timestamp, retry_count, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'pending')`,
    [id, params.entityType, params.action, JSON.stringify(params.payload), params.tempId ?? null, params.entityId ?? null, now]
  );

  return id;
}

/** Все pending записи, отсортированные по timestamp (FIFO). */
export function outboxGetPending(): OutboxEntry[] {
  const db = getDatabase();
  const rows = db.getAllSync(
    `SELECT * FROM outbox WHERE status = 'pending' ORDER BY timestamp ASC`
  );
  return rows.map(rowToEntry);
}

/** Удалить запись после успешной синхронизации. */
export function outboxRemove(id: string): void {
  const db = getDatabase();
  db.runSync(`DELETE FROM outbox WHERE id = ?`, [id]);
}

/** Увеличить retry count; пометить 'failed' если превышен MAX_RETRIES. */
export function outboxIncrementRetry(id: string): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE outbox SET retry_count = retry_count + 1,
     status = CASE WHEN retry_count + 1 >= ? THEN 'failed' ELSE 'pending' END
     WHERE id = ?`,
    [MAX_RETRIES, id]
  );
}

/** Количество pending записей (для badge в UI). */
export function outboxPendingCount(): number {
  const db = getDatabase();
  const result = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM outbox WHERE status = 'pending'`
  );
  return result?.count ?? 0;
}

/** Все failed записи (для дебага / ручного retry). */
export function outboxGetFailed(): OutboxEntry[] {
  const db = getDatabase();
  const rows = db.getAllSync(
    `SELECT * FROM outbox WHERE status = 'failed' ORDER BY timestamp ASC`
  );
  return rows.map(rowToEntry);
}

/** Очистить всё (при logout). */
export function outboxClear(): void {
  const db = getDatabase();
  db.runSync(`DELETE FROM outbox`);
}

function rowToEntry(row: any): OutboxEntry {
  return {
    id: row.id,
    entityType: row.entity_type as EntityType,
    action: row.action as OutboxAction,
    payload: row.payload,
    tempId: row.temp_id,
    entityId: row.entity_id,
    timestamp: row.timestamp,
    retryCount: row.retry_count,
    status: row.status as 'pending' | 'failed',
  };
}
```

### 2.3 Новый файл: `src/db/cache.ts`

```typescript
import { getDatabase } from './database';
import { CacheKey } from '../types/offline';

/** Прочитать кеш. Возвращает null если нет данных. */
export function cacheGet<T>(key: CacheKey): { data: T; lastSync: number } | null {
  const db = getDatabase();
  const row = db.getFirstSync<{ data: string; last_sync: number }>(
    `SELECT data, last_sync FROM cache WHERE key = ?`,
    [key]
  );
  if (!row) return null;
  return {
    data: JSON.parse(row.data) as T,
    lastSync: row.last_sync,
  };
}

/** Записать данные в кеш. Upsert (INSERT OR REPLACE). */
export function cacheSet<T>(key: CacheKey, data: T): void {
  const db = getDatabase();
  const now = Date.now();
  db.runSync(
    `INSERT OR REPLACE INTO cache (key, data, last_sync) VALUES (?, ?, ?)`,
    [key, JSON.stringify(data), now]
  );
}

/** Удалить конкретную запись кеша. */
export function cacheRemove(key: CacheKey): void {
  const db = getDatabase();
  db.runSync(`DELETE FROM cache WHERE key = ?`, [key]);
}

/** Очистить весь кеш (при logout). */
export function cacheClear(): void {
  const db = getDatabase();
  db.runSync(`DELETE FROM cache`);
}
```

### 2.4 Новый файл: `src/db/index.ts`

```typescript
export { getDatabase, closeDatabase } from './database';
export {
  outboxPush,
  outboxGetPending,
  outboxRemove,
  outboxIncrementRetry,
  outboxPendingCount,
  outboxGetFailed,
  outboxClear,
} from './outbox';
export { cacheGet, cacheSet, cacheRemove, cacheClear } from './cache';
```

---

## Фаза 3: Network Status

### 3.1 Изменить: `src/store/useAppStore.ts`

**Добавить** `isOnline` + `setIsOnline`.
**Удалить** transaction/settlement state (переезжает в React Query).
**Обновить** `logout()` — чистить SQLite.

```typescript
import { create } from 'zustand';
import { User, AppSettings, Category } from '../types';
import { fallbackCategories } from '../constants/categories';
import { outboxClear, cacheClear } from '../db';

interface AppState {
  // State
  user: User | null;
  isLoading: boolean;
  isOnline: boolean;                    // <-- НОВОЕ
  categories: Category[];
  settings: AppSettings;
  pairId: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  setIsOnline: (isOnline: boolean) => void;  // <-- НОВОЕ
  setCategories: (categories: Category[]) => void;
  setPartnerName: (name: string) => void;
  setPairId: (pairId: string | null) => void;
  logout: () => void;
}

const initialState = {
  user: null as User | null,
  isLoading: true,
  isOnline: true,                       // <-- Считаем online при старте
  categories: fallbackCategories,
  settings: {
    partnerName: 'Партнёр',
  },
  pairId: null as string | null,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setIsOnline: (isOnline) => set({ isOnline }),
  setCategories: (categories) => set({ categories }),

  setPartnerName: (name) =>
    set((state) => ({
      settings: { ...state.settings, partnerName: name },
    })),

  setPairId: (pairId) => set({ pairId }),

  logout: () => {
    outboxClear();  // <-- Чистим SQLite outbox
    cacheClear();   // <-- Чистим SQLite cache
    set({ ...initialState, isLoading: false });
  },
}));
```

**Удалено**: `transactions`, `settlements`, `setTransactions`, `addTransaction`, `removeTransaction`, `addSettlement`, `setSettlements`, `removeSettlement`, импорт `calculateBalance`.

### 3.2 Новый файл: `src/hooks/useNetworkStatus.ts`

```typescript
import { useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useAppStore } from '../store/useAppStore';

export function useNetworkStatus(): boolean {
  const isOnline = useAppStore((s) => s.isOnline);
  const setIsOnline = useAppStore((s) => s.setIsOnline);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
    });

    // Начальная проверка
    NetInfo.fetch().then((state) => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
    });

    return () => unsubscribe();
  }, [setIsOnline]);

  return isOnline;
}
```

---

## Фаза 4: React Query setup

### 4.1 Новый файл: `src/query/queryClient.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,       // 5 минут
      gcTime: 1000 * 60 * 60 * 24,    // 24 часа (garbage collection)
      retry: (failureCount, error) => {
        // Не retry при сетевых ошибках — sync engine разберётся
        if (isNetworkError(error)) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,     // Мобильное приложение
      refetchOnReconnect: true,        // Refetch при восстановлении связи
    },
    mutations: {
      retry: false,                    // Мутации через outbox, не React Query retry
    },
  },
});

function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('Network Error') || error.message.includes('timeout');
  }
  return false;
}
```

### 4.2 Новый файл: `src/query/queryKeys.ts`

```typescript
export const queryKeys = {
  transactions: {
    all: ['transactions'] as const,
    pair: ['transactions', 'pair'] as const,
  },
  settlements: {
    all: ['settlements'] as const,
  },
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
  },
} as const;
```

### 4.3 Изменить: `App.tsx`

```typescript
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';    // <-- НОВОЕ
import { queryClient } from './src/query/queryClient';           // <-- НОВОЕ
import { getDatabase } from './src/db/database';                 // <-- НОВОЕ
import { AppNavigator } from './src/navigation/AppNavigator';
import { authService } from './src/services/auth';
import { useAppStore } from './src/store/useAppStore';
import { SplashScreen } from './src/components/SplashScreen';
import { pairsApi } from './src/services/pairs';
import { categoriesApi } from './src/services/categories';
import { useShallow } from 'zustand/react/shallow';

export default function App() {
  const { setUser, setLoading, setPairId, setCategories, isLoading } = useAppStore(
    useShallow((s) => ({
      setUser: s.setUser,
      setLoading: s.setLoading,
      setPairId: s.setPairId,
      setCategories: s.setCategories,
      isLoading: s.isLoading,
    })),
  );

  useEffect(() => {
    const checkAuth = async () => {
      try {
        getDatabase(); // <-- НОВОЕ: инициализация SQLite таблиц

        const authenticated = await authService.isAuthenticated();
        if (authenticated) {
          const user = await authService.getCurrentUser();
          if (user) {
            setUser(user);
          } else {
            await authService.logout();
            return;
          }
          const pairRes = await pairsApi.me();
          if (pairRes.success && pairRes.data) {
            setPairId(pairRes.data.pair ?? null);
          }
          const categories = await categoriesApi.getAll();
          if (categories.length > 0) {
            setCategories(categories);
          }
        }
      } catch (e) {
        console.error('Auth check failed:', e);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>   {/* <-- НОВОЕ */}
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </SafeAreaProvider>
    </QueryClientProvider>                         {/* <-- НОВОЕ */}
  );
}
```

---

## Фаза 5: Query-хуки (чтение)

### 5.1 Новый файл: `src/hooks/useTransactions.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query/queryKeys';
import { transactionsApi } from '../services/transactions';
import { cacheGet, cacheSet } from '../db';
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
        // Offline: читаем из SQLite cache
        const cached = cacheGet<Transaction[]>(cacheKey);
        if (cached) return cached.data;
        return [];
      }

      // Online: fetch из API, потом обновляем cache
      const data = pairId
        ? await transactionsApi.getAllPair()
        : await transactionsApi.getAll();
      cacheSet(cacheKey, data);
      return data;
    },
    // initialData из cache для мгновенного отображения
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
```

### 5.2 Новый файл: `src/hooks/useSettlements.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query/queryKeys';
import { settlementsApi } from '../services/settlements';
import { cacheGet, cacheSet } from '../db';
import { CACHE_KEYS } from '../types/offline';
import { Settlement } from '../types';
import { useAppStore } from '../store/useAppStore';

export function useSettlements() {
  const isOnline = useAppStore((s) => s.isOnline);

  return useQuery<Settlement[]>({
    queryKey: queryKeys.settlements.all,
    queryFn: async () => {
      if (!isOnline) {
        const cached = cacheGet<Settlement[]>(CACHE_KEYS.SETTLEMENTS);
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
```

### 5.3 Новый файл: `src/hooks/useDashboardStats.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query/queryKeys';
import { dashboardApi } from '../services/dashboard';
import { cacheGet, cacheSet } from '../db';
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
```

---

## Фаза 6: Mutation-хуки (запись с outbox)

### 6.1 Новый файл: `src/hooks/useCreateTransaction.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { queryKeys } from '../query/queryKeys';
import { transactionsApi } from '../services/transactions';
import { outboxPush } from '../db';
import { useAppStore } from '../store/useAppStore';
import { Transaction } from '../types';

interface CreateTransactionInput {
  amount: number;
  categoryId: number;
  splitMode: 'PERSONAL' | 'PARTNER' | 'HALF';
  description?: string;
  pairId?: string;
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const isOnline = useAppStore((s) => s.isOnline);
  const user = useAppStore((s) => s.user);
  const pairId = useAppStore((s) => s.pairId);

  const activeQueryKey = pairId ? queryKeys.transactions.pair : queryKeys.transactions.all;

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      if (isOnline) {
        const result = await transactionsApi.create(input);
        if (!result) throw new Error('Failed to create transaction');
        return result;
      }
      // Offline: вернуть null — outbox путь
      return null;
    },

    onMutate: async (input: CreateTransactionInput) => {
      // Отменить текущие refetch'и
      await queryClient.cancelQueries({ queryKey: activeQueryKey });

      // Snapshot для rollback
      const previousTransactions = queryClient.getQueryData<Transaction[]>(activeQueryKey);

      const tempId = uuidv4();

      // Optimistic transaction
      const optimisticTx: Transaction = {
        id: tempId,
        amount: input.amount,
        categoryId: input.categoryId,
        splitMode: input.splitMode,
        description: input.description,
        userId: user?.id ?? '',
        pairId: input.pairId ?? pairId ?? undefined,
        createdAt: new Date().toISOString(),
        _pendingOutboxId: tempId, // маркер "pending"
      };

      // Optimistic update в query cache
      queryClient.setQueryData<Transaction[]>(activeQueryKey, (old = []) => {
        return [optimisticTx, ...old];
      });

      // Если offline — в outbox
      if (!isOnline) {
        outboxPush({
          entityType: 'transaction',
          action: 'create',
          payload: input,
          tempId,
        });
      }

      return { previousTransactions, tempId };
    },

    onSuccess: (serverTx, _input, context) => {
      if (serverTx && context) {
        // Online: заменить optimistic на серверный ответ
        queryClient.setQueryData<Transaction[]>(activeQueryKey, (old = []) => {
          return old.map((tx) => (tx.id === context.tempId ? serverTx : tx));
        });
      }
      // Offline (serverTx === null): optimistic запись остаётся с _pendingOutboxId
    },

    onError: (_err, _input, context) => {
      // Rollback при ошибке
      if (context?.previousTransactions) {
        queryClient.setQueryData(activeQueryKey, context.previousTransactions);
      }
    },

    onSettled: () => {
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      }
    },
  });
}
```

### 6.2 Новый файл: `src/hooks/useUpdateTransaction.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query/queryKeys';
import { transactionsApi } from '../services/transactions';
import { outboxPush } from '../db';
import { useAppStore } from '../store/useAppStore';
import { Transaction, CreateTransactionPayload } from '../types';

interface UpdateTransactionInput {
  id: string;
  patch: Partial<CreateTransactionPayload>;
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const isOnline = useAppStore((s) => s.isOnline);
  const pairId = useAppStore((s) => s.pairId);
  const activeQueryKey = pairId ? queryKeys.transactions.pair : queryKeys.transactions.all;

  return useMutation({
    mutationFn: async ({ id, patch }: UpdateTransactionInput) => {
      if (isOnline) {
        const result = await transactionsApi.update(id, patch);
        if (!result) throw new Error('Failed to update transaction');
        return result;
      }
      return null;
    },

    onMutate: async ({ id, patch }: UpdateTransactionInput) => {
      await queryClient.cancelQueries({ queryKey: activeQueryKey });
      const previousTransactions = queryClient.getQueryData<Transaction[]>(activeQueryKey);

      // Optimistic patch
      queryClient.setQueryData<Transaction[]>(activeQueryKey, (old = []) => {
        return old.map((tx) => {
          if (tx.id !== id) return tx;
          return {
            ...tx,
            ...patch,
            _pendingOutboxId: isOnline ? undefined : tx.id,
          };
        });
      });

      if (!isOnline) {
        outboxPush({
          entityType: 'transaction',
          action: 'update',
          payload: patch,
          entityId: id,
        });
      }

      return { previousTransactions };
    },

    onSuccess: (serverTx, { id }) => {
      if (serverTx) {
        queryClient.setQueryData<Transaction[]>(activeQueryKey, (old = []) => {
          return old.map((tx) => (tx.id === id ? serverTx : tx));
        });
      }
    },

    onError: (_err, _input, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData(activeQueryKey, context.previousTransactions);
      }
    },

    onSettled: () => {
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      }
    },
  });
}
```

### 6.3 Новый файл: `src/hooks/useDeleteTransaction.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query/queryKeys';
import { transactionsApi } from '../services/transactions';
import { outboxPush } from '../db';
import { useAppStore } from '../store/useAppStore';
import { Transaction } from '../types';

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const isOnline = useAppStore((s) => s.isOnline);
  const pairId = useAppStore((s) => s.pairId);
  const activeQueryKey = pairId ? queryKeys.transactions.pair : queryKeys.transactions.all;

  return useMutation({
    mutationFn: async (id: string) => {
      if (isOnline) {
        const success = await transactionsApi.remove(id);
        if (!success) throw new Error('Failed to delete transaction');
        return true;
      }
      return false;
    },

    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: activeQueryKey });
      const previousTransactions = queryClient.getQueryData<Transaction[]>(activeQueryKey);

      // Optimistic remove
      queryClient.setQueryData<Transaction[]>(activeQueryKey, (old = []) => {
        return old.filter((tx) => tx.id !== id);
      });

      if (!isOnline) {
        outboxPush({
          entityType: 'transaction',
          action: 'delete',
          payload: { id },
          entityId: id,
        });
      }

      return { previousTransactions };
    },

    onError: (_err, _id, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData(activeQueryKey, context.previousTransactions);
      }
    },

    onSettled: () => {
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      }
    },
  });
}
```

### 6.4 Новый файл: `src/hooks/useCreateSettlement.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { queryKeys } from '../query/queryKeys';
import { settlementsApi } from '../services/settlements';
import { outboxPush } from '../db';
import { useAppStore } from '../store/useAppStore';
import { Settlement, CreateSettlementPayload } from '../types';

export function useCreateSettlement() {
  const queryClient = useQueryClient();
  const isOnline = useAppStore((s) => s.isOnline);
  const user = useAppStore((s) => s.user);
  const pairId = useAppStore((s) => s.pairId);

  return useMutation({
    mutationFn: async (input: CreateSettlementPayload) => {
      if (isOnline) {
        const result = await settlementsApi.create(input);
        if (!result) throw new Error('Failed to create settlement');
        return result;
      }
      return null;
    },

    onMutate: async (input: CreateSettlementPayload) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.settlements.all });
      const previousSettlements = queryClient.getQueryData<Settlement[]>(queryKeys.settlements.all);

      const tempId = uuidv4();

      const optimisticSettlement: Settlement = {
        id: tempId,
        amount: input.amount,
        payerId: user?.id ?? '',
        payeeId: input.payeeId,
        pairId: pairId ?? '',
        description: input.description,
        createdAt: new Date().toISOString(),
        _pendingOutboxId: tempId,
      };

      queryClient.setQueryData<Settlement[]>(queryKeys.settlements.all, (old = []) => {
        return [optimisticSettlement, ...old];
      });

      if (!isOnline) {
        outboxPush({
          entityType: 'settlement',
          action: 'create',
          payload: input,
          tempId,
        });
      }

      return { previousSettlements, tempId };
    },

    onSuccess: (serverSettlement, _input, context) => {
      if (serverSettlement && context) {
        queryClient.setQueryData<Settlement[]>(queryKeys.settlements.all, (old = []) => {
          return old.map((s) => (s.id === context.tempId ? serverSettlement : s));
        });
      }
    },

    onError: (_err, _input, context) => {
      if (context?.previousSettlements) {
        queryClient.setQueryData(queryKeys.settlements.all, context.previousSettlements);
      }
    },

    onSettled: () => {
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      }
    },
  });
}
```

### 6.5 Новый файл: `src/hooks/useDeleteSettlement.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query/queryKeys';
import { settlementsApi } from '../services/settlements';
import { outboxPush } from '../db';
import { useAppStore } from '../store/useAppStore';
import { Settlement } from '../types';

export function useDeleteSettlement() {
  const queryClient = useQueryClient();
  const isOnline = useAppStore((s) => s.isOnline);

  return useMutation({
    mutationFn: async (id: string) => {
      if (isOnline) {
        const success = await settlementsApi.remove(id);
        if (!success) throw new Error('Failed to delete settlement');
        return true;
      }
      return false;
    },

    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.settlements.all });
      const previousSettlements = queryClient.getQueryData<Settlement[]>(queryKeys.settlements.all);

      queryClient.setQueryData<Settlement[]>(queryKeys.settlements.all, (old = []) => {
        return old.filter((s) => s.id !== id);
      });

      if (!isOnline) {
        outboxPush({
          entityType: 'settlement',
          action: 'delete',
          payload: { id },
          entityId: id,
        });
      }

      return { previousSettlements };
    },

    onError: (_err, _id, context) => {
      if (context?.previousSettlements) {
        queryClient.setQueryData(queryKeys.settlements.all, context.previousSettlements);
      }
    },

    onSettled: () => {
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      }
    },
  });
}
```

---

## Фаза 7: Sync Engine

### 7.1 Новый файл: `src/sync/syncEngine.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query/queryKeys';
import { outboxGetPending, outboxRemove, outboxIncrementRetry } from '../db/outbox';
import { cacheSet } from '../db/cache';
import { CACHE_KEYS, OutboxEntry } from '../types/offline';
import { transactionsApi } from '../services/transactions';
import { settlementsApi } from '../services/settlements';
import { dashboardApi } from '../services/dashboard';
import { useAppStore } from '../store/useAppStore';

let isSyncing = false;

/**
 * Главная функция синхронизации. Вызывается при:
 *   - Восстановлении связи (NetInfo listener)
 *   - Pull-to-refresh
 *   - Возврат app из background (AppState)
 *
 * Шаги:
 *   1. Drain outbox (отправить pending мутации FIFO)
 *   2. Fetch свежие данные с сервера
 *   3. Обновить SQLite cache
 *   4. Invalidate React Query для re-render UI
 */
export async function performSync(queryClient: QueryClient): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;

  try {
    // Шаг 1: Обработать outbox
    await drainOutbox();

    // Шаг 2 + 3: Fetch свежие данные и обновить cache
    await refreshServerData();

    // Шаг 4: Invalidate React Query
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

/**
 * Обработать все pending outbox записи по порядку.
 * Каждая запись маппится на конкретный API вызов по entityType + action.
 */
async function drainOutbox(): Promise<void> {
  const entries = outboxGetPending();

  for (const entry of entries) {
    try {
      await processOutboxEntry(entry);
      outboxRemove(entry.id);
    } catch (error) {
      console.warn(`Outbox entry ${entry.id} failed:`, error);
      outboxIncrementRetry(entry.id);
      // Продолжаем обработку остальных — не останавливаемся на одной ошибке
    }
  }
}

/**
 * Выполнить API вызов соответствующий outbox записи.
 */
async function processOutboxEntry(entry: OutboxEntry): Promise<void> {
  const payload = JSON.parse(entry.payload);

  switch (entry.entityType) {
    case 'transaction':
      switch (entry.action) {
        case 'create': {
          const result = await transactionsApi.create(payload);
          if (!result) throw new Error('Server rejected transaction create');
          break;
        }
        case 'update': {
          if (!entry.entityId) throw new Error('Missing entityId for transaction update');
          const result = await transactionsApi.update(entry.entityId, payload);
          if (!result) throw new Error('Server rejected transaction update');
          break;
        }
        case 'delete': {
          if (!entry.entityId) throw new Error('Missing entityId for transaction delete');
          const success = await transactionsApi.remove(entry.entityId);
          if (!success) throw new Error('Server rejected transaction delete');
          break;
        }
      }
      break;

    case 'settlement':
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
      break;
  }
}

/**
 * Fetch свежие данные с сервера и обновить SQLite cache.
 * Запускается ПОСЛЕ drainOutbox, когда сервер имеет последнее состояние.
 */
async function refreshServerData(): Promise<void> {
  const pairId = useAppStore.getState().pairId;

  // Все fetch'и параллельно
  const [transactions, pairTransactions, settlements, dashboardStats] = await Promise.allSettled([
    transactionsApi.getAll(),
    pairId ? transactionsApi.getAllPair() : Promise.resolve([]),
    settlementsApi.getAll(),
    dashboardApi.getStats(),
  ]);

  // Обновить cache для каждого успешного fetch
  if (transactions.status === 'fulfilled') {
    cacheSet(CACHE_KEYS.TRANSACTIONS, transactions.value);
  }
  if (pairTransactions.status === 'fulfilled') {
    cacheSet(CACHE_KEYS.TRANSACTIONS_PAIR, pairTransactions.value);
  }
  if (settlements.status === 'fulfilled') {
    cacheSet(CACHE_KEYS.SETTLEMENTS, settlements.value);
  }
  if (dashboardStats.status === 'fulfilled' && dashboardStats.value) {
    cacheSet(CACHE_KEYS.DASHBOARD_STATS, dashboardStats.value);
  }
}
```

### 7.2 Новый файл: `src/hooks/useSyncOnReconnect.ts`

```typescript
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { performSync } from '../sync/syncEngine';
import { useAppStore } from '../store/useAppStore';

/**
 * Триггерит sync при:
 * 1. Восстановлении связи (isOnline: false → true)
 * 2. Возврат app из background (AppState → active)
 */
export function useSyncOnReconnect(): void {
  const queryClient = useQueryClient();
  const isOnline = useAppStore((s) => s.isOnline);
  const wasOffline = useRef(false);

  // Тригер 1: восстановление связи
  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      return;
    }

    if (wasOffline.current) {
      wasOffline.current = false;
      performSync(queryClient);
    }
  }, [isOnline, queryClient]);

  // Тригер 2: app foreground
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active' && isOnline) {
        performSync(queryClient);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isOnline, queryClient]);
}
```

### 7.3 Новый файл: `src/hooks/useManualSync.ts`

```typescript
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { performSync } from '../sync/syncEngine';
import { useAppStore } from '../store/useAppStore';

export function useManualSync() {
  const queryClient = useQueryClient();
  const isOnline = useAppStore((s) => s.isOnline);
  const [isSyncing, setIsSyncing] = useState(false);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    try {
      if (isOnline) {
        await performSync(queryClient);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [queryClient, isOnline]);

  return { sync, isSyncing };
}
```

---

## Фаза 8: Обновление UI

### 8.1 Новый файл: `src/components/ConnectionStatusBar.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { outboxPendingCount } from '../db';

export const ConnectionStatusBar: React.FC = () => {
  const isOnline = useAppStore((s) => s.isOnline);

  if (isOnline) return null;

  const pendingCount = outboxPendingCount();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Офлайн-режим{pendingCount > 0 ? ` (${pendingCount} в очереди)` : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F59E0B', // amber/warning
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
```

### 8.2 Изменить: `src/components/TransactionCard.tsx`

Добавить pending badge когда `transaction._pendingOutboxId` присутствует:

```typescript
// В JSX, после <Text style={styles.amount}>:
{transaction._pendingOutboxId && (
  <Ionicons
    name="cloud-upload-outline"
    size={16}
    color="#F59E0B"
    style={{ marginLeft: 6 }}
  />
)}
```

### 8.3 Изменить: `src/screens/DashboardScreen.tsx`

**Убрать:**
- `useState` для `stats`, `refreshing`
- `loadData` callback
- `useEffect` для loadData
- `addSettlement` из `useAppStore`
- Прямые вызовы `dashboardApi`, `settlementsApi`

**Добавить:**
```typescript
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useCreateSettlement } from '../hooks/useCreateSettlement';
import { useManualSync } from '../hooks/useManualSync';

// В компоненте:
const { data: stats, isLoading, refetch } = useDashboardStats();
const createSettlement = useCreateSettlement();
const { sync, isSyncing } = useManualSync();

const onRefresh = useCallback(async () => {
  await sync();
  await refetch();
}, [sync, refetch]);

const handleSettle = async (amount: number) => {
  if (!partnerId) return;
  createSettlement.mutate({
    amount,
    payeeId: partnerId,
  });
};

// RefreshControl: refreshing={isSyncing}
```

### 8.4 Изменить: `src/screens/AddTransactionScreen.tsx`

**Убрать:**
- `addTransaction` из `useAppStore`
- `transactionsApi` import и прямой вызов
- `isSubmitting` state

**Добавить:**
```typescript
import { useCreateTransaction } from '../hooks/useCreateTransaction';

// В компоненте:
const createTransaction = useCreateTransaction();

const handleSubmit = async () => {
  if (!amount || !selectedCategory || createTransaction.isPending) return;

  createTransaction.mutate(
    {
      amount: parseFloat(amount),
      categoryId: selectedCategory,
      splitMode,
      description: description || undefined,
      pairId: pairId || undefined,
    },
    {
      onSuccess: () => {
        // Reset form
        setAmount('');
        setSelectedCategory(null);
        setDescription('');
        setSplitMode('HALF');
        setIsFocused(false);
        handleScrollUp();
      },
      onError: () => {
        Alert.alert('Ошибка', 'Не удалось создать транзакцию');
      },
    },
  );
};

// Кнопка disabled: createTransaction.isPending
// Текст кнопки: createTransaction.isPending ? 'Добавление...' : 'Добавить'
```

### 8.5 Изменить: `src/screens/HistoryScreen.tsx`

**Убрать:**
- `transactions`, `setTransactions` из `useAppStore`
- `loadTransactions` callback
- `useEffect` для loadTransactions

**Добавить:**
```typescript
import { useTransactions } from '../hooks/useTransactions';
import { useManualSync } from '../hooks/useManualSync';

// В компоненте:
const { data: transactions = [], refetch } = useTransactions();
const { sync, isSyncing } = useManualSync();

const onRefresh = useCallback(async () => {
  await sync();
  await refetch();
}, [sync, refetch]);

// pairId и user остаются из useAppStore (нужны для фильтрации)
// RefreshControl: refreshing={isSyncing}
```

### 8.6 Изменить: `src/navigation/AppNavigator.tsx`

В `MainTabs` добавить:

```typescript
import { ConnectionStatusBar } from '../components/ConnectionStatusBar';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useSyncOnReconnect } from '../hooks/useSyncOnReconnect';

const MainTabs: React.FC = () => {
  useNetworkStatus();       // Подписка на NetInfo
  useSyncOnReconnect();     // Auto-sync при восстановлении связи

  return (
    <>
      <ConnectionStatusBar />   {/* Жёлтая плашка при offline */}
      <Tab.Navigator ... >
        {/* существующие экраны без изменений */}
      </Tab.Navigator>
    </>
  );
};
```

---

## Фаза 9: Cleanup при logout

### Изменить: `src/screens/SettingsScreen.tsx` (или где вызывается logout)

```typescript
import { queryClient } from '../query/queryClient';

// В обработчике logout:
const handleLogout = async () => {
  await authService.logout();
  queryClient.clear();        // <-- Чистим React Query cache
  store.logout();             // <-- Чистим Zustand + SQLite (outboxClear + cacheClear)
};
```

Вызов `queryClient.clear()` из компонента, а не из store — избегаем circular import.

---

## Манифест файлов

### Новые файлы (20):

| Файл | Назначение |
|------|-----------|
| `src/types/offline.ts` | Типы OutboxEntry, CacheKey, constants |
| `src/db/database.ts` | SQLite init, CREATE TABLE |
| `src/db/outbox.ts` | Outbox CRUD с оптимизациями |
| `src/db/cache.ts` | Cache get/set |
| `src/db/index.ts` | Barrel export |
| `src/query/queryClient.ts` | QueryClient config |
| `src/query/queryKeys.ts` | Query key constants |
| `src/hooks/useNetworkStatus.ts` | NetInfo hook |
| `src/hooks/useTransactions.ts` | Transactions query |
| `src/hooks/useSettlements.ts` | Settlements query |
| `src/hooks/useDashboardStats.ts` | Dashboard query |
| `src/hooks/useCreateTransaction.ts` | Create mutation + outbox |
| `src/hooks/useUpdateTransaction.ts` | Update mutation + outbox |
| `src/hooks/useDeleteTransaction.ts` | Delete mutation + outbox |
| `src/hooks/useCreateSettlement.ts` | Create settlement + outbox |
| `src/hooks/useDeleteSettlement.ts` | Delete settlement + outbox |
| `src/hooks/useSyncOnReconnect.ts` | Auto-sync triggers |
| `src/hooks/useManualSync.ts` | Manual sync for pull-to-refresh |
| `src/sync/syncEngine.ts` | Sync: drain outbox + refresh cache |
| `src/components/ConnectionStatusBar.tsx` | Offline indicator |

### Изменяемые файлы (9):

| Файл | Что меняется |
|------|-------------|
| `package.json` | +4 зависимости (+1 devDep) |
| `App.tsx` | QueryClientProvider, getDatabase() init |
| `src/types/index.ts` | `_pendingOutboxId?` в Transaction, Settlement |
| `src/store/useAppStore.ts` | -transactions/settlements, +isOnline, logout cleanup |
| `src/screens/DashboardScreen.tsx` | React Query hooks вместо прямых API calls |
| `src/screens/AddTransactionScreen.tsx` | useCreateTransaction вместо transactionsApi.create |
| `src/screens/HistoryScreen.tsx` | useTransactions вместо store + API |
| `src/components/TransactionCard.tsx` | Pending badge (cloud-upload icon) |
| `src/navigation/AppNavigator.tsx` | +ConnectionStatusBar, useNetworkStatus, useSyncOnReconnect |

---

## Порядок реализации (dependency-safe)

1. **Фаза 1** (типы + deps) — нет runtime зависимостей, enables всё остальное
2. **Фаза 2** (SQLite db layer) — зависит от типов Фазы 1; тестируется изолированно
3. **Фаза 3** (network status) — зависит от store изменений; тестируется изолированно
4. **Фаза 4** (React Query setup) — зависит от установленных deps; тестируется изолированно
5. **Фаза 5** (query hooks) — зависит от Фазы 2 (cache) + Фазы 4 (React Query)
6. **Фаза 6** (mutation hooks) — зависит от Фазы 2 (outbox) + Фазы 4 (React Query)
7. **Фаза 7** (sync engine) — зависит от Фазы 2 (outbox + cache) + знания mutation patterns
8. **Фаза 8** (UI updates) — зависит от всех предыдущих; можно по экранам
9. **Фаза 9** (logout cleanup) — мелочь, вместе с Фазой 8

**Рекомендация по миграции экранов (Фаза 8):**
1. HistoryScreen — самый простой (только read query)
2. AddTransactionScreen — одна мутация
3. DashboardScreen — read + settlement mutation (самый сложный)

---

## Верификация (как тестировать)

1. **Online CRUD**: добавить/удалить транзакцию → данные обновляются мгновенно, Dashboard пересчитывается
2. **Offline create**: Airplane mode → добавить транзакцию → появляется с cloud icon → вкл. сеть → icon исчезает, данные на сервере
3. **Cache read**: загрузить данные → Airplane mode → перезапуск app → History и Dashboard показывают кешированные данные
4. **Outbox retry**: Airplane mode → создать 3 транзакции → вкл. сеть → все 3 отправлены по порядку
5. **Settlement offline**: создать settlement offline → при восстановлении сети синхронизируется
6. **Logout cleanup**: logout → SQLite таблицы очищены, React Query cache пуст
7. **Connection bar**: Airplane mode → жёлтая плашка "Офлайн-режим (N в очереди)" → вкл. сеть → плашка исчезает
