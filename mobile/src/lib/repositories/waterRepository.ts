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
  const loggedDate = loggedAt.slice(0, 10);
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO local_water_entries (
      local_id, server_id, user_id, volume_ml, logged_date,
      client_created_at, sync_status, sync_attempts, last_sync_error, created_at
    ) VALUES (?, NULL, ?, ?, ?, ?, 'pending', 0, NULL, ?);`,
    [id, data.userId, data.amountMl, loggedDate, loggedAt, now]
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
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM local_water_entries
     WHERE user_id = ? AND logged_date = ? AND sync_status != 'deleted_pending'
     ORDER BY client_created_at ASC;`,
    [userId, date]
  );

  return rows.map((r) => ({
    id: r.local_id,
    user_id: r.user_id,
    amount_ml: r.volume_ml,
    logged_at: r.client_created_at,
    created_at: r.created_at,
    is_deleted: r.sync_status === "deleted_pending" ? 1 : 0,
    server_id: r.server_id ? String(r.server_id) : null,
  }));
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
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM local_water_entries
     WHERE user_id = ? AND sync_status != 'deleted_pending'
     ORDER BY client_created_at DESC
     LIMIT ? OFFSET ?;`,
    [userId, limit, offset]
  );

  return rows.map((r) => ({
    id: r.local_id,
    user_id: r.user_id,
    amount_ml: r.volume_ml,
    logged_at: r.client_created_at,
    created_at: r.created_at,
    is_deleted: r.sync_status === "deleted_pending" ? 1 : 0,
    server_id: r.server_id ? String(r.server_id) : null,
  }));
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
    `SELECT COALESCE(SUM(volume_ml), 0) as total
     FROM local_water_entries
     WHERE user_id = ? AND logged_date = ? AND sync_status != 'deleted_pending';`,
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
    `SELECT logged_date as date, COALESCE(SUM(volume_ml), 0) as amount_ml
     FROM local_water_entries
     WHERE user_id = ?
       AND sync_status != 'deleted_pending'
       AND client_created_at >= datetime('now', ? || ' days')
     GROUP BY logged_date
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
    `UPDATE local_water_entries
     SET sync_status = 'deleted_pending'
     WHERE local_id = ? AND user_id = ?;`,
    [id, userId]
  );
  await enqueue("delete", "water", id, { local_id: id });
}

