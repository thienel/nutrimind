/**
 * Weight Repository — CRUD cho weight_logs
 *
 * Lưu lịch sử cân nặng offline, tự enqueue sync.
 */

import { getDb, generateUUID } from "@/lib/db";
import { enqueue } from "@/lib/repositories/syncQueue";
import { toLocalDateKey } from "@/lib/dateUtils";

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
  // 1. Validate weight_kg
  if (data.weightKg < 15.0 || data.weightKg > 500.0) {
    throw new Error("Cân nặng không hợp lệ (phải từ 15-500kg)");
  }

  const db = await getDb();
  const loggedAt = data.loggedAt ?? new Date().toISOString();
  const loggedDate = toLocalDateKey(loggedAt);
  
  // 2. Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(loggedDate)) {
    throw new Error("Định dạng ngày không hợp lệ");
  }

  // 3. Check duplicate
  const existing = await db.getFirstAsync<{ "1": number }>(
    `SELECT 1 FROM local_weight_entries
     WHERE user_id = ? AND logged_date = ? AND sync_status != 'deleted_pending'
     LIMIT 1;`,
    [data.userId, loggedDate]
  );
  if (existing) {
    throw new Error("Bạn đã ghi cân nặng cho ngày này rồi");
  }

  const id = generateUUID();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO local_weight_entries (
        local_id, server_id, user_id, weight_kg, logged_date, note,
        client_created_at, sync_status, sync_attempts, last_sync_error, created_at
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, 'pending', 0, NULL, ?);`,
      [id, data.userId, data.weightKg, loggedDate, data.note ?? null, loggedAt, now]
    );

    await enqueue("create", "weight", id, {
      local_id: id,
      weight_kg: data.weightKg,
      note: data.note ?? null,
      logged_at: loggedAt,
    });
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
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM local_weight_entries
     WHERE user_id = ? AND sync_status != 'deleted_pending'
     ORDER BY client_created_at DESC
     LIMIT ? OFFSET ?;`,
    [userId, limit, offset]
  );

  return rows.map((r) => ({
    id: r.local_id,
    user_id: r.user_id,
    weight_kg: r.weight_kg,
    note: r.note,
    logged_at: r.client_created_at,
    created_at: r.created_at,
    is_deleted: r.sync_status === "deleted_pending" ? 1 : 0,
    server_id: r.server_id ? String(r.server_id) : null,
  }));
}

/**
 * Cân nặng mới nhất được ghi.
 */
export async function getLatestWeight(
  userId: number
): Promise<WeightLog | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<any>(
    `SELECT * FROM local_weight_entries
     WHERE user_id = ? AND sync_status != 'deleted_pending'
     ORDER BY client_created_at DESC
     LIMIT 1;`,
    [userId]
  );

  if (!r) return null;

  return {
    id: r.local_id,
    user_id: r.user_id,
    weight_kg: r.weight_kg,
    note: r.note,
    logged_at: r.client_created_at,
    created_at: r.created_at,
    is_deleted: r.sync_status === "deleted_pending" ? 1 : 0,
    server_id: r.server_id ? String(r.server_id) : null,
  };
}

/**
 * Lấy lịch sử cân nặng theo từng ngày (dùng cho biểu đồ).
 */
export async function getWeightChartData(
  userId: number,
  days = 30
): Promise<{ date: string; weight_kg: number }[]> {
  const db = await getDb();
  return db.getAllAsync<{ date: string; weight_kg: number }>(
    `SELECT logged_date as date, weight_kg
     FROM local_weight_entries
     WHERE user_id = ?
       AND sync_status != 'deleted_pending'
       AND client_created_at >= datetime('now', ? || ' days')
     GROUP BY logged_date
     HAVING client_created_at = MAX(client_created_at)
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
  await db.withTransactionAsync(async () => {
    const entry = await db.getFirstAsync<{ server_id: string | null }>(
      `SELECT server_id FROM local_weight_entries WHERE local_id = ? AND user_id = ?;`,
      [id, userId]
    );

    if (!entry) return;

    if (entry.server_id == null) {
      // Trường hợp A
      await db.runAsync(`DELETE FROM local_weight_entries WHERE local_id = ?;`, [id]);
      await db.runAsync(`DELETE FROM sync_queue WHERE local_id = ?;`, [id]);
    } else {
      // Trường hợp B & C
      await db.runAsync(
        `UPDATE local_weight_entries
         SET sync_status = 'deleted_pending'
         WHERE local_id = ? AND user_id = ?;`,
        [id, userId]
      );
      await enqueue("delete", "weight", id, { server_id: Number(entry.server_id) });
    }
  });
}

