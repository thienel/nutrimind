import type { SQLiteDatabase } from 'expo-sqlite';
import type { LocalWeightEntry, SyncStatus } from '../schema';

/**
 * Repository for local_weight_entries table.
 * One entry per day per user (enforced by business logic, not DB constraint).
 */
export class WeightRepository {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Insert a new weight entry.
   */
  async insertWeightEntry(
    entry: Omit<LocalWeightEntry, 'sync_status' | 'sync_attempts' | 'last_sync_error'>
  ): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO local_weight_entries (
        local_id, server_id, user_id, weight_kg, logged_date, note,
        client_created_at, sync_status, sync_attempts, last_sync_error, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, NULL, ?)`,
      [
        entry.local_id,
        entry.server_id ?? null,
        entry.user_id,
        entry.weight_kg,
        entry.logged_date,
        entry.note ?? null,
        entry.client_created_at,
        entry.created_at,
      ]
    );
  }

  /**
   * Get the weight entry for a specific user and date (max 1 per day).
   */
  async getWeightEntryByDate(
    userId: number,
    date: string
  ): Promise<LocalWeightEntry | null> {
    const row = await this.db.getFirstAsync<LocalWeightEntry>(
      `SELECT * FROM local_weight_entries
       WHERE user_id = ? AND logged_date = ? AND sync_status != 'deleted_pending'
       LIMIT 1`,
      [userId, date]
    );
    return row ?? null;
  }

  /**
   * Get weight entries for a date range (e.g. for trend chart).
   */
  async getWeightEntriesInRange(
    userId: number,
    fromDate: string,
    toDate: string
  ): Promise<LocalWeightEntry[]> {
    return this.db.getAllAsync<LocalWeightEntry>(
      `SELECT * FROM local_weight_entries
       WHERE user_id = ? AND logged_date >= ? AND logged_date <= ?
         AND sync_status != 'deleted_pending'
       ORDER BY logged_date ASC`,
      [userId, fromDate, toDate]
    );
  }

  /**
   * Get all entries with a specific sync_status.
   */
  async getWeightEntriesBySync(status: SyncStatus): Promise<LocalWeightEntry[]> {
    return this.db.getAllAsync<LocalWeightEntry>(
      `SELECT * FROM local_weight_entries WHERE sync_status = ? ORDER BY created_at ASC`,
      [status]
    );
  }

  /**
   * Update sync status after a sync attempt.
   */
  async updateWeightSyncStatus(
    localId: string,
    status: SyncStatus,
    serverId?: number,
    error?: string
  ): Promise<void> {
    await this.db.runAsync(
      `UPDATE local_weight_entries
       SET sync_status = ?,
           server_id = COALESCE(?, server_id),
           last_sync_error = ?,
           sync_attempts = sync_attempts + 1
       WHERE local_id = ?`,
      [status, serverId ?? null, error ?? null, localId]
    );
  }

  /**
   * Update the note on a weight entry.
   */
  async updateWeightNote(localId: string, note: string): Promise<void> {
    await this.db.runAsync(
      'UPDATE local_weight_entries SET note = ? WHERE local_id = ?',
      [note, localId]
    );
  }

  /**
   * Soft-delete a weight entry.
   */
  async softDeleteWeightEntry(localId: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE local_weight_entries SET sync_status = 'deleted_pending' WHERE local_id = ?`,
      [localId]
    );
  }

  /**
   * Hard-delete a weight entry from local DB.
   */
  async hardDeleteWeightEntry(localId: string): Promise<void> {
    await this.db.runAsync(
      'DELETE FROM local_weight_entries WHERE local_id = ?',
      [localId]
    );
  }
}
