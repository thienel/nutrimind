import type { SQLiteDatabase } from 'expo-sqlite';
import type { LocalMealEntry, SyncStatus } from '../schema';

/**
 * Repository for local_meal_entries table.
 */
export class MealRepository {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Insert a new meal entry.
   */
  async insertMealEntry(
    entry: Omit<LocalMealEntry, 'sync_status' | 'sync_attempts' | 'last_sync_error'>
  ): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO local_meal_entries (
        local_id, server_id, user_id, food_name, meal_type,
        calories, protein_g, carb_g, fat_g,
        source, ai_confidence, logged_date,
        client_created_at, sync_status, sync_attempts, last_sync_error, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, NULL, ?)`,
      [
        entry.local_id,
        entry.server_id ?? null,
        entry.user_id,
        entry.food_name,
        entry.meal_type,
        entry.calories,
        entry.protein_g,
        entry.carb_g,
        entry.fat_g,
        entry.source,
        entry.ai_confidence ?? null,
        entry.logged_date,
        entry.client_created_at,
        entry.created_at,
      ]
    );
  }

  /**
   * Get all non-deleted meal entries for a given user and date.
   */
  async getMealEntriesByDate(
    userId: number,
    date: string
  ): Promise<LocalMealEntry[]> {
    return this.db.getAllAsync<LocalMealEntry>(
      `SELECT * FROM local_meal_entries
       WHERE user_id = ? AND logged_date = ? AND sync_status != 'deleted_pending'
       ORDER BY client_created_at ASC`,
      [userId, date]
    );
  }

  /**
   * Get all entries with a specific sync_status (for sync processing).
   */
  async getMealEntriesBySync(status: SyncStatus): Promise<LocalMealEntry[]> {
    return this.db.getAllAsync<LocalMealEntry>(
      `SELECT * FROM local_meal_entries WHERE sync_status = ? ORDER BY created_at ASC`,
      [status]
    );
  }

  /**
   * Update sync status after a sync attempt (success or failure).
   */
  async updateMealSyncStatus(
    localId: string,
    status: SyncStatus,
    serverId?: number,
    error?: string
  ): Promise<void> {
    await this.db.runAsync(
      `UPDATE local_meal_entries
       SET sync_status = ?,
           server_id = COALESCE(?, server_id),
           last_sync_error = ?,
           sync_attempts = sync_attempts + 1
       WHERE local_id = ?`,
      [status, serverId ?? null, error ?? null, localId]
    );
  }

  /**
   * Soft-delete a meal entry by marking it as 'deleted_pending'.
   * The sync engine will then DELETE it on the server before purging locally.
   */
  async softDeleteMealEntry(localId: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE local_meal_entries SET sync_status = 'deleted_pending' WHERE local_id = ?`,
      [localId]
    );
  }

  /**
   * Hard-delete a meal entry from local DB (after server confirms deletion).
   */
  async hardDeleteMealEntry(localId: string): Promise<void> {
    await this.db.runAsync(
      'DELETE FROM local_meal_entries WHERE local_id = ?',
      [localId]
    );
  }

  /**
   * Get a single meal entry by local_id.
   */
  async getMealEntryById(localId: string): Promise<LocalMealEntry | null> {
    const row = await this.db.getFirstAsync<LocalMealEntry>(
      'SELECT * FROM local_meal_entries WHERE local_id = ?',
      [localId]
    );
    return row ?? null;
  }
}