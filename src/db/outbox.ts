import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import { OutboxEntry, EntityType, OutboxAction } from '../types/offline';
const MAX_RETRIES = 3;

interface OutboxRow {
  id: string;
  entity_type: string;
  action: string;
  payload: string;
  temp_id: string | null;
  entity_id: string | null;
  timestamp: number;
  retry_count: number;
  status: string;
}

export function outboxPush(params: {
  entityType: EntityType;
  action: OutboxAction;
  payload: object;
  tempId?: string;
  entityId?: string;
}) {
  let db;
  try {
    db = getDatabase();
  } catch {
    return '';
  }
  if (params.action === 'delete' && params.entityId) {
    const pendingCreate = db.getFirstSync<{ id: string }>(
      `SELECT id FROM outbox WHERE temp_id = ? AND action = 'create' AND status = 'pending'`,
      [params.entityId],
    );

    if (pendingCreate) {
      db.runSync(`DELETE FROM outbox WHERE id = ?`, [pendingCreate.id]);
      return '';
    }
  }

  if (params.action === 'update' && params.entityId) {
    const pendingCreate = db.getFirstSync<{ id: string; payload: string }>(
      `SELECT id FROM outbox WHERE temp_id = ? AND action = 'create' AND status = 'pending'`,
      [params.entityId],
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

  const id = Crypto.randomUUID();
  const timestamp = Date.now();

  db.runSync(
    `INSERT INTO outbox (id, entity_type, action, payload, temp_id, entity_id, timestamp, retry_count, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'pending')`,
    [
      id,
      params.entityType,
      params.action,
      JSON.stringify(params.payload),
      params.tempId ?? null,
      params.entityId ?? null,
      timestamp,
    ],
  );
  return id;
}

export function outboxGetPending(): OutboxEntry[] {
  try {
    const db = getDatabase();
    const rows = db.getAllSync<OutboxRow>(`SELECT * FROM outbox WHERE status = 'pending'`);
    return rows.map(rowToEntry);
  } catch {
    return [];
  }
}

export function outboxRemove(id: string): void {
  try {
    const db = getDatabase();
    db.runSync(`DELETE FROM outbox WHERE id = ?`, [id]);
  } catch {}
}

export function outboxIncrementRetry(id: string): void {
  try {
    const db = getDatabase();
    db.runSync(
      `UPDATE outbox SET retry_count = retry_count + 1
      , status = CASE WHEN retry_count + 1 >= ? THEN 'failed' ELSE 'pending' END
      WHERE id =?`,
      [MAX_RETRIES, id],
    );
  } catch {}
}

export function outboxPendingCount(): number {
  try {
    const db = getDatabase();
    const result = db.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) as count FROM outbox WHERE status = 'pending'`,
    );
    return result?.count ?? 0;
  } catch {
    return 0;
  }
}

export function outboxGetFailed(): OutboxEntry[] {
  try {
    const db = getDatabase();
    const rows = db.getAllSync<OutboxRow>(`SELECT * FROM outbox WHERE status = 'failed'`);
    return rows.map(rowToEntry);
  } catch {
    return [];
  }
}

export function outboxClear(): void {
  try {
    const db = getDatabase();
    db.runSync(`DELETE FROM outbox`);
  } catch {}
}

function rowToEntry(row: OutboxRow): OutboxEntry {
  return {
    id: row.id,
    action: row.action as OutboxAction,
    entityType: row.entity_type as EntityType,
    payload: row.payload,
    tempId: row.temp_id,
    entityId: row.entity_id,
    timestamp: row.timestamp,
    retryCount: row.retry_count,
    status: row.status as 'pending' | 'failed',
  };
}
