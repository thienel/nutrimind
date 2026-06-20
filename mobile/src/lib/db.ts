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
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS meal_entries (
      id          TEXT    PRIMARY KEY,
      user_id     INTEGER NOT NULL,
      name        TEXT    NOT NULL,
      calories    REAL    NOT NULL DEFAULT 0,
      protein_g   REAL    DEFAULT 0,
      carbs_g     REAL    DEFAULT 0,
      fat_g       REAL    DEFAULT 0,
      meal_type   TEXT    NOT NULL DEFAULT 'other',
      logged_at   TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      is_deleted  INTEGER NOT NULL DEFAULT 0,
      server_id   TEXT
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS water_logs (
      id          TEXT    PRIMARY KEY,
      user_id     INTEGER NOT NULL,
      amount_ml   REAL    NOT NULL,
      logged_at   TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      is_deleted  INTEGER NOT NULL DEFAULT 0,
      server_id   TEXT
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS weight_logs (
      id          TEXT    PRIMARY KEY,
      user_id     INTEGER NOT NULL,
      weight_kg   REAL    NOT NULL,
      note        TEXT,
      logged_at   TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      is_deleted  INTEGER NOT NULL DEFAULT 0,
      server_id   TEXT
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      action      TEXT    NOT NULL,
      entity      TEXT    NOT NULL,
      local_id    TEXT    NOT NULL,
      payload     TEXT    NOT NULL,
      status      TEXT    NOT NULL DEFAULT 'pending',
      retries     INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      synced_at   TEXT
    );
  `);

  await db.execAsync(
    "CREATE INDEX IF NOT EXISTS idx_meal_user_date ON meal_entries(user_id, logged_at);"
  );

  await db.execAsync(
    "CREATE INDEX IF NOT EXISTS idx_water_user_date ON water_logs(user_id, logged_at);"
  );

  await db.execAsync(
    "CREATE INDEX IF NOT EXISTS idx_weight_user_date ON weight_logs(user_id, logged_at);"
  );

  await db.execAsync(
    "CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_queue(status);"
  );

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
}

/** Xóa toàn bộ data của user, gọi khi sign-out */
export async function clearUserData(userId: number): Promise<void> {
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM meal_entries WHERE user_id = ?;", [userId]);
    await db.runAsync("DELETE FROM water_logs WHERE user_id = ?;", [userId]);
    await db.runAsync("DELETE FROM weight_logs WHERE user_id = ?;", [userId]);
    await db.runAsync("DELETE FROM sync_queue WHERE status = 'pending';");
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