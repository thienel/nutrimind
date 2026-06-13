/**
 * Meal Repository — CRUD cho meal_entries
 *
 * Mọi write operation đều tự enqueue vào sync_queue để
 * SyncManager upload lên server khi có mạng.
 */

import { getDb, generateUUID } from "@/lib/db";
import { enqueue } from "@/lib/repositories/syncQueue";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "other";

export interface MealEntry {
  id: string;
  user_id: number;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_type: MealType;
  logged_at: string; // ISO8601 date string
  created_at: string;
  is_deleted: number; // 0 | 1 (SQLite boolean)
  server_id: string | null;
}

export interface InsertMealData {
  userId: number;
  name: string;
  calories: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  mealType?: MealType;
  loggedAt?: string; // mặc định: hôm nay
}

/**
 * Thêm meal entry mới.
 * @returns id của record vừa tạo
 */
export async function insertMeal(data: InsertMealData): Promise<string> {
  const db = await getDb();
  const id = generateUUID();
  const loggedAt = data.loggedAt ?? new Date().toISOString();

  await db.runAsync(
    `INSERT INTO meal_entries
       (id, user_id, name, calories, protein_g, carbs_g, fat_g, meal_type, logged_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      data.userId,
      data.name,
      data.calories,
      data.proteinG ?? 0,
      data.carbsG ?? 0,
      data.fatG ?? 0,
      data.mealType ?? "other",
      loggedAt,
    ]
  );

  // Enqueue sync
  await enqueue("create", "meal", id, {
    local_id: id,
    name: data.name,
    calories: data.calories,
    protein_g: data.proteinG ?? 0,
    carbs_g: data.carbsG ?? 0,
    fat_g: data.fatG ?? 0,
    meal_type: data.mealType ?? "other",
    logged_at: loggedAt,
  });

  return id;
}

/**
 * Lấy danh sách meals của user trong một ngày.
 * @param date - dạng "YYYY-MM-DD"
 */
export async function getMealsByDate(
  userId: number,
  date: string
): Promise<MealEntry[]> {
  const db = await getDb();
  return db.getAllAsync<MealEntry>(
    `SELECT * FROM meal_entries
     WHERE user_id = ?
       AND date(logged_at) = ?
       AND is_deleted = 0
     ORDER BY logged_at ASC;`,
    [userId, date]
  );
}

/**
 * Lấy toàn bộ lịch sử meals (phân trang đơn giản).
 * @param limit  Số bản ghi tối đa
 * @param offset Bắt đầu từ bản ghi thứ mấy
 */
export async function getMealHistory(
  userId: number,
  limit = 50,
  offset = 0
): Promise<MealEntry[]> {
  const db = await getDb();
  return db.getAllAsync<MealEntry>(
    `SELECT * FROM meal_entries
     WHERE user_id = ? AND is_deleted = 0
     ORDER BY logged_at DESC
     LIMIT ? OFFSET ?;`,
    [userId, limit, offset]
  );
}

/**
 * Xóa mềm (soft-delete) meal entry.
 * Record vẫn tồn tại trong DB nhưng is_deleted = 1.
 */
export async function deleteMeal(id: string, userId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE meal_entries SET is_deleted = 1 WHERE id = ? AND user_id = ?;`,
    [id, userId]
  );

  // Enqueue sync delete
  await enqueue("delete", "meal", id, { local_id: id });
}

/** Tính tổng calories trong ngày */
export async function getDailyCalories(
  userId: number,
  date: string
): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(calories), 0) as total
     FROM meal_entries
     WHERE user_id = ? AND date(logged_at) = ? AND is_deleted = 0;`,
    [userId, date]
  );
  return row?.total ?? 0;
}

/** Tổng hợp macros trong ngày */
export async function getDailyMacros(
  userId: number,
  date: string
): Promise<{ calories: number; protein: number; carbs: number; fat: number }> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>(
    `SELECT
       COALESCE(SUM(calories), 0)  as calories,
       COALESCE(SUM(protein_g), 0) as protein,
       COALESCE(SUM(carbs_g), 0)   as carbs,
       COALESCE(SUM(fat_g), 0)     as fat
     FROM meal_entries
     WHERE user_id = ? AND date(logged_at) = ? AND is_deleted = 0;`,
    [userId, date]
  );
  return row ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

/** Lấy tổng calories theo từng ngày trong N ngày gần nhất (cho chart) */
export async function getDailyCalorieHistory(
  userId: number,
  days = 7
): Promise<{ date: string; calories: number }[]> {
  const db = await getDb();
  return db.getAllAsync<{ date: string; calories: number }>(
    `SELECT date(logged_at) as date, COALESCE(SUM(calories), 0) as calories
     FROM meal_entries
     WHERE user_id = ?
       AND is_deleted = 0
       AND logged_at >= datetime('now', ? || ' days')
     GROUP BY date(logged_at)
     ORDER BY date ASC;`,
    [userId, -days]
  );
}
