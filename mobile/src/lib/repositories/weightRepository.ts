/**
 * Weight Repository — CRUD cho weight_logs
 *
 * Lưu lịch sử cân nặng offline, tự enqueue sync.
 */

import { getDb, generateUUID } from "@/lib/db";
import { enqueue } from "@/lib/repositories/syncQueue";

export interface WeightLog {
  id: string;
  user_id: number;
  weight_kg: number;
  note: string | null;
  logged_at: string;
  created_at: string;
  is_deleted: number;
  server_id: string | null;
}

export interface InsertWeightData {
  userId: number;
  weightKg: number;
  note?: string;
  loggedAt?: string;
}

/**
 * Log cân nặng mới.
 * @returns id của record vừa tạo
 */
export async function logWeight(data: InsertWeightData): Promise<string> {
  const db = await getDb();
  const id = generateUUID();
  const loggedAt = data.loggedAt ?? new Date().toISOString();

  await db.runAsync(
    `INSERT INTO weight_logs (id, user_id, weight_kg, note, logged_at)
     VALUES (?, ?, ?, ?, ?);`,
    [id, data.userId, data.weightKg, data.note ?? null, loggedAt]
  );

  await enqueue("create", "weight", id, {
    local_id: id,
    weight_kg: data.weightKg,
    note: data.note ?? null,
    logged_at: loggedAt,
  });

  return id;
}

/**
 * Lấy lịch sử cân nặng, mới nhất trước.
 */
export async function getWeightHistory(
  userId: number,
  limit = 30,
  offset = 0
): Promise<WeightLog[]> {
  const db = await getDb();
  return db.getAllAsync<WeightLog>(
    `SELECT * FROM weight_logs
     WHERE user_id = ? AND is_deleted = 0
     ORDER BY logged_at DESC
     LIMIT ? OFFSET ?;`,
    [userId, limit, offset]
  );
}

/**
 * Cân nặng mới nhất được ghi.
 */
export async function getLatestWeight(
  userId: number
): Promise<WeightLog | null> {
  const db = await getDb();
  return db.getFirstAsync<WeightLog>(
    `SELECT * FROM weight_logs
     WHERE user_id = ? AND is_deleted = 0
     ORDER BY logged_at DESC
     LIMIT 1;`,
    [userId]
  );
}

/**
 * Lấy lịch sử cân nặng theo từng ngày (dùng cho biểu đồ).
 */
export async function getWeightChartData(
  userId: number,
  days = 30
): Promise<{ date: string; weight_kg: number }[]> {
  const db = await getDb();
  // Lấy giá trị cuối cùng trong ngày (ghi nhiều lần thì lấy cái cuối)
  return db.getAllAsync<{ date: string; weight_kg: number }>(
    `SELECT date(logged_at) as date, weight_kg
     FROM weight_logs
     WHERE user_id = ?
       AND is_deleted = 0
       AND logged_at >= datetime('now', ? || ' days')
     GROUP BY date(logged_at)
     HAVING logged_at = MAX(logged_at)
     ORDER BY date ASC;`,
    [userId, -days]
  );
}

/** Xóa mềm weight log */
export async function deleteWeightLog(
  id: string,
  userId: number
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE weight_logs SET is_deleted = 1 WHERE id = ? AND user_id = ?;`,
    [id, userId]
  );
  await enqueue("delete", "weight", id, { local_id: id });
}
