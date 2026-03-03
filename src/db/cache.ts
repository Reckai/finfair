import { getDatabase } from './database';
import { CacheKey } from '../types/offline';

export function cacheGet<T>(key: CacheKey): { data: T; lastSync: number } | null {
  try {
    const db = getDatabase();
    const row = db.getFirstSync<{ data: string; last_sync: number }>(
      `SELECT data, last_sync FROM cache WHERE key = ?`,
      [key],
    );
    if (!row) {
      return null;
    }
    return {
      data: JSON.parse(row.data) as T,
      lastSync: row.last_sync,
    };
  } catch {
    return null;
  }
}

export function cacheSet<T>(key: CacheKey, data: T): void {
  try {
    const db = getDatabase();
    const now = Date.now();
    db.runSync(`INSERT OR REPLACE INTO cache (key, data, last_sync) VALUES (?,?,?)`, [
      key,
      JSON.stringify(data),
      now,
    ]);
  } catch {}
}

export function cacheRemove(key: CacheKey): void {
  try {
    const db = getDatabase();
    db.runSync(`DELETE FROM cache WHERE key = ?`, [key]);
  } catch {}
}

export function cacheClear(): void {
  try {
    const db = getDatabase();
    db.runSync(`DELETE FROM cache`);
  } catch {}
}
