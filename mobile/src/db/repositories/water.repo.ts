import type { SQLiteDatabase } from 'expo-sqlite';
import type { LocalWaterEntry, SyncStatus } from '../schema';

/**
 * Repository for local_water_entries table.
 */
export class WaterRepository {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Insert a new water entry.
   */
  async insertWaterEntry(
    entry: Omit<LocalWaterEntry, 'sync_status' | 'sync_attempts' | 'last_sync_error'>
  ): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO local_water_entries (
        local_id, server_id, user_id, volume_ml, logged_date,
        client_created_at, sync_status, sync_attempts, last_sync_error, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, NULL, ?)`,
      [
        entry.local_id,
        entry.server_id ?? null,
        entry.user_id,
        entry.volume_ml,
        entry.logged_date,
        entry.client_created_at,
        entry.created_at,
      ]
    );
  }

  /**
   * Get all non-deleted water entries for a given user and date.
   */
  async getWaterEntriesByDate(
    userId: number,
    date: string
  ): Promise<LocalWaterEntry[]> {
    return this.db.getAllAsync<LocalWaterEntry>(
      `SELECT * FROM local_water_entries
       WHERE user_id = ? AND logged_date = ? AND sync_status != 'deleted_pending'
       ORDER BY client_created_at ASC`,
      [userId, date]
    );
  }

  /**
   * Get total water volume consumed on a given date.
   */
  async getTotalWaterByDate(userId: number, date: string): Promise<number> {
    const row = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(volume_ml), 0) AS total
       FROM local_water_entries
       WHERE user_id = ? AND logged_date = ? AND sync_status != 'deleted_pending'`,
      [userId, date]
    );
    return row?.total ?? 0;
  }

  /**
   * Get all entries with a specific sync_status.
   */
  async getWaterEntriesBySync(status: SyncStatus): Promise<LocalWaterEntry[]> {
    return this.db.getAllAsync<LocalWaterEntry>(
      `SELECT * FROM local_water_entries WHERE sync_status = ? ORDER BY created_at ASC`,
      [status]
    );
  }

  /**
   * Update sync status after a sync attempt.
   */
  async updateWaterSyncStatus(
    localId: string,
    status: SyncStatus,
    serverId?: number,
    error?: string
  ): Promise<void> {
    await this.db.runAsync(
      `UPDATE local_water_entries
       SET sync_status = ?,
           server_id = COALESCE(?, server_id),
           last_sync_error = ?,
           sync_attempts = sync_attempts + 1
       WHERE local_id = ?`,
      [status, serverId ?? null, error ?? null, localId]
    );
  }

  /**
   * Soft-delete a water entry.
   */
  async softDeleteWaterEntry(localId: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE local_water_entries SET sync_status = 'deleted_pending' WHERE local_id = ?`,
      [localId]
    );
  }

  /**
   * Hard-delete a water entry from local DB.
   */
  async hardDeleteWaterEntry(localId: string): Promise<void> {
    await this.db.runAsync(
      'DELETE FROM local_water_entries WHERE local_id = ?',
      [localId]
    );
  }
}
