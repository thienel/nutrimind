/**
 * Water Repository — CRUD cho water_logs
 *
 * Lưu trữ log nước uống offline, tự enqueue sync.
 */

import { getDb, generateUUID } from "@/lib/db";
import { enqueue } from "@/lib/repositories/syncQueue";

export interface WaterLog {
  id: string;
  user_id: number;
  amount_ml: number;
  logged_at: string;
  created_at: string;
  is_deleted: number;
  server_id: string | null;
}

export interface InsertWaterData {
  userId: number;
  amountMl: number;
  loggedAt?: string;
}

/**
 * Log lượng nước uống mới.
 * @returns id của record vừa tạo
 */
export async function logWater(data: InsertWaterData): Promise<string> {
  const db = await getDb();
  const id = generateUUID();
  const loggedAt = data.loggedAt ?? new Date().toISOString();

  await db.runAsync(
    `INSERT INTO water_logs (id, user_id, amount_ml, logged_at)
     VALUES (?, ?, ?, ?);`,
    [id, data.userId, data.amountMl, loggedAt]
  );

  await enqueue("create", "water", id, {
    local_id: id,
    amount_ml: data.amountMl,
    logged_at: loggedAt,
  });

  return id;
}

/**
 * Lấy tất cả water logs trong một ngày.
 * @param date - dạng "YYYY-MM-DD"
 */
export async function getWaterByDate(
  userId: number,
  date: string
): Promise<WaterLog[]> {
  const db = await getDb();
  return db.getAllAsync<WaterLog>(
    `SELECT * FROM water_logs
     WHERE user_id = ? AND date(logged_at) = ? AND is_deleted = 0
     ORDER BY logged_at ASC;`,
    [userId, date]
  );
}

/**
 * Lấy lịch sử water logs.
 */
export async function getWaterHistory(
  userId: number,
  limit = 30,
  offset = 0
): Promise<WaterLog[]> {
  const db = await getDb();
  return db.getAllAsync<WaterLog>(
    `SELECT * FROM water_logs
     WHERE user_id = ? AND is_deleted = 0
     ORDER BY logged_at DESC
     LIMIT ? OFFSET ?;`,
    [userId, limit, offset]
  );
}

/**
 * Tổng lượng nước uống trong ngày (ml).
 */
export async function getDailyWaterTotal(
  userId: number,
  date: string
): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount_ml), 0) as total
     FROM water_logs
     WHERE user_id = ? AND date(logged_at) = ? AND is_deleted = 0;`,
    [userId, date]
  );
  return row?.total ?? 0;
}

/**
 * Tổng lượng nước theo từng ngày trong N ngày gần nhất (cho chart).
 */
export async function getDailyWaterHistory(
  userId: number,
  days = 7
): Promise<{ date: string; amount_ml: number }[]> {
  const db = await getDb();
  return db.getAllAsync<{ date: string; amount_ml: number }>(
    `SELECT date(logged_at) as date, COALESCE(SUM(amount_ml), 0) as amount_ml
     FROM water_logs
     WHERE user_id = ?
       AND is_deleted = 0
       AND logged_at >= datetime('now', ? || ' days')
     GROUP BY date(logged_at)
     ORDER BY date ASC;`,
    [userId, -days]
  );
}

/** Xóa mềm water log */
export async function deleteWaterLog(
  id: string,
  userId: number
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE water_logs SET is_deleted = 1 WHERE id = ? AND user_id = ?;`,
    [id, userId]
  );
  await enqueue("delete", "water", id, { local_id: id });
}
