import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  SyncQueueItem,
  SyncQueueStatus,
  SyncOperation,
  EntityType,
} from '../schema';
import { generateUUID, nowISO } from '../../services/uuid';

/**
 * Repository for sync_queue table — the central outbox for all offline operations.
 */
export class SyncQueueRepository {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Enqueue a new sync operation.
   * Returns the new queue item's id (UUID).
   */
  async enqueue(item: {
    operation: SyncOperation;
    entity_type: EntityType;
    local_id: string;
    payload: object;
    max_attempts?: number;
  }): Promise<string> {
    const id = await generateUUID();
    const now = nowISO();
    const maxAttempts = item.max_attempts ?? 3;

    await this.db.runAsync(
      `INSERT INTO sync_queue (
        id, operation, entity_type, local_id, payload,
        status, attempts, max_attempts, last_error, created_at, next_retry_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, NULL, ?, NULL)`,
      [
        id,
        item.operation,
        item.entity_type,
        item.local_id,
        JSON.stringify(item.payload),
        maxAttempts,
        now,
      ]
    );

    return id;
  }

  /**
   * Get pending items that are ready to be processed (next_retry_at is null or in the past).
   * Ordered oldest-first (FIFO).
   */
  async getPendingItems(limit = 20): Promise<SyncQueueItem[]> {
    const now = nowISO();
    return this.db.getAllAsync<SyncQueueItem>(
      `SELECT * FROM sync_queue
       WHERE status = 'pending'
         AND (next_retry_at IS NULL OR next_retry_at <= ?)
       ORDER BY CASE WHEN operation = 'DELETE' OR operation = 'delete' THEN 1 ELSE 2 END ASC, created_at ASC
       LIMIT ?`,
      [now, limit]
    );
  }

  /**
   * Get all failed items that have not exceeded max_attempts.
   */
  async getRetryableItems(): Promise<SyncQueueItem[]> {
    const now = nowISO();
    return this.db.getAllAsync<SyncQueueItem>(
      `SELECT * FROM sync_queue
       WHERE status = 'failed'
         AND attempts < max_attempts
         AND (next_retry_at IS NULL OR next_retry_at <= ?)
       ORDER BY CASE WHEN operation = 'DELETE' OR operation = 'delete' THEN 1 ELSE 2 END ASC, created_at ASC`,
      [now]
    );
  }

  /**
   * Mark a queue item as processing (to avoid double-processing).
   */
  async markProcessing(id: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE sync_queue SET status = 'processing' WHERE id = ?`,
      [id]
    );
  }

  /**
   * Mark a queue item as done after successful sync.
   */
  async markDone(id: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE sync_queue SET status = 'done' WHERE id = ?`,
      [id]
    );
  }

  /**
   * Mark a queue item as failed and schedule a retry with exponential backoff.
   * If attempts >= max_attempts, the status stays 'failed' (no more retry).
   */
  async markFailed(id: string, error: string): Promise<void> {
    const item = await this.getById(id);
    if (!item) return;

    const newAttempts = item.attempts + 1;
    const exceeded = newAttempts >= item.max_attempts;

    // Exponential backoff: 30s, 2min, 8min, ...
    const backoffSeconds = Math.min(30 * Math.pow(4, item.attempts), 8 * 60);
    const nextRetry = exceeded
      ? null
      : new Date(Date.now() + backoffSeconds * 1000).toISOString();

    await this.db.runAsync(
      `UPDATE sync_queue
       SET status = ?,
           attempts = ?,
           last_error = ?,
           next_retry_at = ?
       WHERE id = ?`,
      [
        exceeded ? 'failed' : 'pending',
        newAttempts,
        error,
        nextRetry,
        id,
      ]
    );
  }

  /**
   * Restore a queue item back to pending without increasing attempts
   * (Used for auth errors like 401 where the failure is not related to the request payload)
   */
  async restorePending(id: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE sync_queue SET status = 'pending' WHERE id = ?`,
      [id]
    );
  }

  /**
   * Dismiss a queue item permanently (e.g. when server says it's a 4xx error that won't succeed).
   */
  async dismiss(id: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE sync_queue SET status = 'dismissed' WHERE id = ?`,
      [id]
    );
  }

  /**
   * Get a single queue item by its id.
   */
  async getById(id: string): Promise<SyncQueueItem | null> {
    const row = await this.db.getFirstAsync<SyncQueueItem>(
      'SELECT * FROM sync_queue WHERE id = ?',
      [id]
    );
    return row ?? null;
  }

  /**
   * Find queue items by entity local_id (useful to check if an entity is already queued).
   */
  async getByLocalId(localId: string): Promise<SyncQueueItem[]> {
    return this.db.getAllAsync<SyncQueueItem>(
      `SELECT * FROM sync_queue WHERE local_id = ? ORDER BY created_at ASC`,
      [localId]
    );
  }

  /**
   * Delete done/dismissed items older than N days to keep the queue clean.
   */
  async pruneCompleted(olderThanDays = 7): Promise<void> {
    const cutoff = new Date(
      Date.now() - olderThanDays * 24 * 60 * 60 * 1000
    ).toISOString();
    await this.db.runAsync(
      `DELETE FROM sync_queue
       WHERE status IN ('done', 'dismissed') AND created_at < ?`,
      [cutoff]
    );
  }

  /**
   * Count items by status (useful for debugging/sync status indicator).
   */
  async countByStatus(): Promise<Record<SyncQueueStatus, number>> {
    const rows = await this.db.getAllAsync<{ status: string; count: number }>(
      `SELECT status, COUNT(*) as count FROM sync_queue GROUP BY status`
    );
    const result: Record<string, number> = {
      pending: 0,
      processing: 0,
      done: 0,
      failed: 0,
      dismissed: 0,
    };
    for (const row of rows) {
      result[row.status] = row.count;
    }
    return result as Record<SyncQueueStatus, number>;
  }

  /**
   * Lấy toàn bộ các mục bị failed (kể cả quá số lần thử) để hiển thị lên giao diện.
   */
  async getAllFailedItems(): Promise<SyncQueueItem[]> {
    return this.db.getAllAsync<SyncQueueItem>(
      `SELECT * FROM sync_queue WHERE status = 'failed' ORDER BY created_at DESC`
    );
  }

  /**
   * (Mục 10.3) Thử lại tất cả các mục failed: chuyển thành pending, reset attempts.
   */
  async retryAllFailed(): Promise<void> {
    await this.db.runAsync(
      `UPDATE sync_queue
       SET status = 'pending',
           attempts = 0,
           last_error = NULL,
           next_retry_at = NULL
       WHERE status = 'failed'`
    );
  }

  /**
   * (Mục 10.3) Bỏ qua tất cả các mục failed: chuyển thành dismissed.
   */
  async dismissAllFailed(): Promise<void> {
    await this.db.runAsync(
      `UPDATE sync_queue
       SET status = 'dismissed'
       WHERE status = 'failed'`
    );
  }
}