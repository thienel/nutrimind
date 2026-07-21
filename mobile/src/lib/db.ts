/**
 * SQLite Database — NutriMind local storage
 *
 * Sử dụng expo-sqlite để lưu trữ dữ liệu offline.
 * Schema version-based migration đảm bảo upgrade an toàn.
 *
 * Tables:
 *   meal_entries  — log bữa ăn
 *   water_logs    — log nước uống
 *   weight_logs   — log cân nặng
 *   sync_queue    — hàng chờ đồng bộ với server
 */

import * as SQLite from "expo-sqlite";
import { ALL_DDL } from "../db/schema";

const DB_NAME = "nutrimind_v2.db";
const SCHEMA_VERSION = 1;

let _db: SQLite.SQLiteDatabase | null = null;

/** Lấy hoặc mở database singleton */
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;

  _db = await SQLite.openDatabaseAsync(DB_NAME);
  return _db;
}

/** Khởi tạo database và chạy migrations. Gọi một lần lúc app start. */
export async function initDatabase(): Promise<void> {
  const db = await getDb();

  // PRAGMAs that change journal_mode must run OUTSIDE a transaction
  await db.execAsync("PRAGMA journal_mode = WAL;");
  await db.execAsync("PRAGMA foreign_keys = ON;");

  await db.withTransactionAsync(async () => {
    // Đọc version hiện tại
    const result = await db.getFirstAsync<{ user_version: number }>(
      "PRAGMA user_version;"
    );
    const currentVersion = result?.user_version ?? 0;

    if (currentVersion < 1) {
      // Bỏ qua migrate cũ vì đã chuyển sang SQLiteProvider với schema mới
      // await migrateV1(db);
    }
  });
}

async function migrateV1(db: SQLite.SQLiteDatabase): Promise<void> {
  // Force drop sync_queue to avoid any schema mismatch with next_retry_at during dev
  await db.execAsync("DROP TABLE IF EXISTS sync_queue;");
  for (const sql of ALL_DDL) {
    await db.execAsync(sql);
  }
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
}

/** Xóa toàn bộ data của user, gọi khi sign-out */
export async function clearUserData(db: SQLite.SQLiteDatabase, userId: number): Promise<void> {

  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM local_profile;");
    await db.runAsync("DELETE FROM local_meal_entries WHERE user_id = ?;", [userId]);
    await db.runAsync("DELETE FROM local_water_entries WHERE user_id = ?;", [userId]);
    await db.runAsync("DELETE FROM local_weight_entries WHERE user_id = ?;", [userId]);
    await db.runAsync("DELETE FROM sync_queue;");
  });
}

/** Tạo UUID v4 đơn giản, không cần thư viện */
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;

    return v.toString(16);
  });
}