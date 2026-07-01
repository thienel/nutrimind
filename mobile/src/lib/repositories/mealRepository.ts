/**
 * Meal Repository — CRUD cho meal_entries sử dụng SQLite thay vì AsyncStorage.
 *
 * Lưu trữ bữa ăn offline, tự động enqueue vào sync_queue.
 * Áp dụng câu lệnh SQLite để tính tổng Calories/Macros theo đúng đặc tả.
 */

import { getDb, generateUUID } from "@/lib/db";
import { enqueue } from "@/lib/repositories/syncQueue";
import { toLocalDateKey } from "@/lib/dateUtils";

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
  logged_at: string;
  created_at: string;
  is_deleted: number;
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
  loggedAt?: string;
  source?: string;
  aiConfidence?: number;
}

function normalizeUserId(userId: number): number {
  if (Number.isFinite(userId) && userId > 0) {
    return userId;
  }
  return 1;
}

export async function insertMeal(data: InsertMealData): Promise<string> {
  const db = await getDb();
  const id = generateUUID();
  const userId = normalizeUserId(data.userId);
  const now = new Date().toISOString();

  const loggedAt = data.loggedAt ?? now;
  const loggedDate = toLocalDateKey(loggedAt);

  const mealName = data.name.trim() || "Meal";
  const calories = Number.isFinite(data.calories) ? data.calories : 0;
  const protein_g = Number.isFinite(data.proteinG ?? 0)
    ? (data.proteinG ?? 0)
    : 0;
  const carb_g = Number.isFinite(data.carbsG ?? 0) ? (data.carbsG ?? 0) : 0;
  const fat_g = Number.isFinite(data.fatG ?? 0) ? (data.fatG ?? 0) : 0;
  const meal_type = data.mealType ?? "other";
  const source = data.source ?? "manual";

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO local_meal_entries (
        local_id, server_id, user_id, food_name, meal_type,
        calories, protein_g, carb_g, fat_g,
        source, ai_confidence, logged_date,
        client_created_at, sync_status, sync_attempts, last_sync_error, created_at
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, NULL, ?);`,
      [
        id,
        userId,
        mealName,
        meal_type,
        calories,
        protein_g,
        carb_g,
        fat_g,
        source,
        data.aiConfidence ?? null,
        loggedDate,
        loggedAt,
        now,
      ],
    );

    await enqueue("create", "meal", id, {
      food_name: mealName,
      meal_type: meal_type,
      calories: calories,
      protein_g: protein_g,
      carb_g: carb_g,
      fat_g: fat_g,
      source: source,
      ai_confidence: data.aiConfidence ?? null,
      logged_date: loggedDate,
      client_created_at: loggedAt,
    });
  });

  return id;
}

export async function getMealHistory(
  userIdInput: number,
  limit = 50,
  offset = 0,
): Promise<MealEntry[]> {
  const userId = normalizeUserId(userIdInput);
  const db = await getDb();

  const rows = await db.getAllAsync<any>(
    `SELECT * FROM local_meal_entries
     WHERE user_id = ? AND sync_status != 'deleted_pending'
     ORDER BY client_created_at DESC
     LIMIT ? OFFSET ?;`,
    [userId, limit, offset],
  );

  return rows.map((r) => ({
    id: r.local_id,
    user_id: r.user_id,
    name: r.food_name,
    calories: r.calories,
    protein_g: r.protein_g,
    carbs_g: r.carb_g,
    fat_g: r.fat_g,
    meal_type: r.meal_type as MealType,
    logged_at: r.client_created_at,
    created_at: r.created_at,
    is_deleted: r.sync_status === "deleted_pending" ? 1 : 0,
    server_id: r.server_id ? String(r.server_id) : null,
  }));
}

export async function getMealsByDate(
  userIdInput: number,
  date: string,
): Promise<MealEntry[]> {
  const userId = normalizeUserId(userIdInput);
  const db = await getDb();
  const dateOnly = toLocalDateKey(date);

  const rows = await db.getAllAsync<any>(
    `SELECT * FROM local_meal_entries
     WHERE user_id = ? AND logged_date = ? AND sync_status != 'deleted_pending'
     ORDER BY client_created_at ASC;`,
    [userId, dateOnly],
  );

  return rows.map((r) => ({
    id: r.local_id,
    user_id: r.user_id,
    name: r.food_name,
    calories: r.calories,
    protein_g: r.protein_g,
    carbs_g: r.carb_g,
    fat_g: r.fat_g,
    meal_type: r.meal_type as MealType,
    logged_at: r.client_created_at,
    created_at: r.created_at,
    is_deleted: r.sync_status === "deleted_pending" ? 1 : 0,
    server_id: r.server_id ? String(r.server_id) : null,
  }));
}

export async function deleteMeal(
  id: string,
  userIdInput: number,
): Promise<void> {
  const userId = normalizeUserId(userIdInput);
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    const entry = await db.getFirstAsync<{ server_id: string | null }>(
      `SELECT server_id FROM local_meal_entries WHERE local_id = ? AND user_id = ?;`,
      [id, userId],
    );

    if (!entry) return;

    if (entry.server_id == null) {
      // Trường hợp A: Xóa entry chưa sync
      await db.runAsync(`DELETE FROM local_meal_entries WHERE local_id = ?;`, [
        id,
      ]);
      await db.runAsync(`DELETE FROM sync_queue WHERE local_id = ?;`, [id]);
    } else {
      // Trường hợp B & C: Đã sync hoặc đang sync
      await db.runAsync(
        `UPDATE local_meal_entries
         SET sync_status = 'deleted_pending'
         WHERE local_id = ? AND user_id = ?;`,
        [id, userId],
      );
      await enqueue("delete", "meal", id, {
        server_id: Number(entry.server_id),
      });
    }
  });
}

export async function getDailyCalories(
  userIdInput: number,
  date: string,
): Promise<number> {
  const userId = normalizeUserId(userIdInput);
  const db = await getDb();
  const dateOnly = toLocalDateKey(date);

  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(calories), 0) as total
     FROM local_meal_entries
     WHERE user_id = ? AND logged_date = ? AND sync_status != 'deleted_pending';`,
    [userId, dateOnly],
  );
  return row?.total ?? 0;
}

export async function getDailyMacros(
  userIdInput: number,
  date: string,
): Promise<{
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}> {
  const userId = normalizeUserId(userIdInput);
  const db = await getDb();
  const dateOnly = toLocalDateKey(date);

  const row = await db.getFirstAsync<{
    cals: number;
    pro: number;
    carb: number;
    fat: number;
  }>(
    `SELECT
      COALESCE(SUM(calories), 0) as cals,
      COALESCE(SUM(protein_g), 0) as pro,
      COALESCE(SUM(carb_g), 0) as carb,
      COALESCE(SUM(fat_g), 0) as fat
     FROM local_meal_entries
     WHERE user_id = ? AND logged_date = ? AND sync_status != 'deleted_pending';`,
    [userId, dateOnly],
  );

  return {
    calories: row?.cals ?? 0,
    protein: row?.pro ?? 0,
    carbs: row?.carb ?? 0,
    fat: row?.fat ?? 0,
  };
}

export async function getDailyCalorieHistory(
  userIdInput: number,
  days = 7,
): Promise<{ date: string; calories: number }[]> {
  const userId = normalizeUserId(userIdInput);
  const db = await getDb();

  // Tạo ra danh sách N ngày (từ quá khứ đến hiện tại)
  // để đảm bảo ngày không có data sẽ map được với 0
  const today = new Date();
  const resultMap: Record<string, number> = {};

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    // Sử dụng local timezone 'en-CA' để giữ YYYY-MM-DD
    const dateKey = d.toLocaleDateString("en-CA");
    resultMap[dateKey] = 0;
  }

  // Lấy dữ liệu group by logged_date từ SQLite theo đúng Spec
  const rows = await db.getAllAsync<{ date: string; calories: number }>(
    `SELECT logged_date as date, COALESCE(SUM(calories), 0) as calories
     FROM local_meal_entries
     WHERE user_id = ?
       AND sync_status != 'deleted_pending'
       AND client_created_at >= datetime('now', ? || ' days')
     GROUP BY logged_date
     ORDER BY date ASC;`,
    [userId, -days],
  );

  // Ghi đè vào map
  for (const row of rows) {
    if (resultMap[row.date] !== undefined) {
      resultMap[row.date] = row.calories;
    }
  }

  // Chuyển sang mảng
  return Object.keys(resultMap)
    .sort()
    .map((date) => ({
      date,
      calories: resultMap[date],
    }));
}

export async function updateMealServerId(
  localId: string,
  serverId: string,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE local_meal_entries SET server_id = ? WHERE local_id = ?`,
    [serverId, localId],
  );
}

export async function getMealServerId(localId: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ server_id: string | null }>(
    `SELECT server_id FROM local_meal_entries WHERE local_id = ?`,
    [localId],
  );
  return row?.server_id ?? null;
}
