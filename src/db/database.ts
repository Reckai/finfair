import * as SQLite from 'expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const getDatabase = () => {
  if (!db) {
    db = openDatabaseSync('finfair.db');
  }
  return db;
};

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

export const closeDatabase = () => {
  if (db) {
    db.closeSync();
    db = null;
  }
};
