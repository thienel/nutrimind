import type { SQLiteDatabase } from 'expo-sqlite';
import { ALL_DDL } from './schema';

export const DB_NAME = 'nutrimind.db';

/**
 * DatabaseManager — handles schema initialization.
 * Pass `DatabaseManager.initialize` as the `onInit` prop of `SQLiteProvider`.
 */
export class DatabaseManager {
  /**
   * Runs all CREATE TABLE / CREATE INDEX statements inside a single transaction.
   * Called once by SQLiteProvider when the database is first opened.
   */
  static async initialize(db: SQLiteDatabase): Promise<void> {
    // Enable WAL mode for better concurrent read performance
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // Run all DDL in one transaction
    await db.withTransactionAsync(async () => {
      for (const sql of ALL_DDL) {
        await db.execAsync(sql);
      }
    });

    console.log('[DB] Database initialized successfully');
  }
}
