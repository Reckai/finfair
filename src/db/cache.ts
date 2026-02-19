import { getDatabase } from './database';
import { CacheKey } from '../types/offline';

export function cacheGet<T>(key: CacheKey): { data: T; lastSync: number } | null {
  const db = getDatabase();
  const row = db.getFirstSync<{ data: string; lastSync: number }>(
    `
        SELECT data, lastSync FROM cache WHERE key = ?`,
    [key],
  );
  if (!row) {
    return null;
  }
  return {
    data: JSON.parse(row.data) as T,
    lastSync: row.lastSync,
  };
}

export function cacheSet<T>(key: CacheKey, data: T): void {
  const db = getDatabase();
  const now = Date.now();
  db.runSync(`INSERT OR REPLACE INTO cache (key, data, last_sync) VALUES (?,?,?)`, [
    key,
    JSON.stringify(data),
    now,
  ]);
}

export function cacheRemove(key: CacheKey): void {
  const db = getDatabase();
  db.runSync(`DELETE FROM cache WHERE key = ?`, [key]);
}

export function cacheClear(): void {
  const db = getDatabase();
  db.runSync(`DELETE FROM cache`);
}
