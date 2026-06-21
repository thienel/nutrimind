import { getDb } from "@/lib/db";
import { toLocalDateKey } from "@/lib/dateUtils";

export interface ProgressSummaryDay {
  logged_date: string;
  total_calories: number;
  total_protein: number;
  total_carb: number;
  total_fat: number;
}

export async function getProgressSummary(userId: number, fromDate: string, toDate: string): Promise<ProgressSummaryDay[]> {
  const db = await getDb();
  
  // Spec 9.7: Tổng calories theo ngày trong khoảng
  const rows = await db.getAllAsync<{
    logged_date: string;
    total_calories: number;
    total_protein: number;
    total_carb: number;
    total_fat: number;
  }>(
    `SELECT
      logged_date,
      SUM(calories)   AS total_calories,
      SUM(protein_g)  AS total_protein,
      SUM(carb_g)     AS total_carb,
      SUM(fat_g)      AS total_fat
    FROM local_meal_entries
    WHERE user_id = ?
      AND logged_date BETWEEN ? AND ?
      AND sync_status != 'deleted_pending'
    GROUP BY logged_date
    ORDER BY logged_date ASC;`,
    [userId, fromDate, toDate]
  );

  // Điền dữ liệu cho các ngày trống (để vẽ biểu đồ)
  const result: ProgressSummaryDay[] = [];
  const start = new Date(fromDate);
  const end = new Date(toDate);
  
  const dateMap = new Map<string, ProgressSummaryDay>();
  for (const row of rows) {
    dateMap.set(row.logged_date, row);
  }

  // Iterate from start to end
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dStr = toLocalDateKey(d);
    if (dateMap.has(dStr)) {
      result.push(dateMap.get(dStr)!);
    } else {
      result.push({
        logged_date: dStr,
        total_calories: 0,
        total_protein: 0,
        total_carb: 0,
        total_fat: 0,
      });
    }
  }

  return result;
}

export interface CalorieDeficit {
  tdee: number;
  calories_consumed: number;
  deficit: number;
}

export async function getCalorieDeficit(userId: number, date: string): Promise<CalorieDeficit> {
  const db = await getDb();
  const dateOnly = toLocalDateKey(date);

  // 1. Fetch Profile for TDEE
  const profile = await db.getFirstAsync<{ tdee: number | null }>(
    `SELECT tdee FROM local_profile WHERE user_id = ?`,
    [userId]
  );
  
  const tdee = profile?.tdee || 2000; // Default if not found

  // 2. Fetch total calories consumed
  const meals = await db.getFirstAsync<{ total_calories: number }>(
    `SELECT COALESCE(SUM(calories), 0) as total_calories
     FROM local_meal_entries
     WHERE user_id = ? AND logged_date = ? AND sync_status != 'deleted_pending'`,
    [userId, dateOnly]
  );

  const caloriesConsumed = meals?.total_calories || 0;
  
  // Deficit: số calo thâm hụt (hoặc dư thừa nếu âm)
  const deficit = tdee - caloriesConsumed;

  return {
    tdee,
    calories_consumed: caloriesConsumed,
    deficit
  };
}

export interface HealthSummary {
  bmi: number | null;
  latest_weight_kg: number | null;
  goal: string | null;
  avg_water_7d_ml: number;
  weight_trend_30d: "up" | "down" | "stable" | "none";
}

export async function getHealthSummary(userId: number): Promise<HealthSummary> {
  const db = await getDb();

  // 1. Profile: goal, bmi
  const profile = await db.getFirstAsync<{ bmi: number | null, goal: string | null }>(
    `SELECT bmi, goal FROM local_profile WHERE user_id = ?`,
    [userId]
  );

  // 2. Latest weight
  const latestWeight = await db.getFirstAsync<{ weight_kg: number }>(
    `SELECT weight_kg FROM local_weight_entries
     WHERE user_id = ? AND sync_status != 'deleted_pending'
     ORDER BY logged_date DESC LIMIT 1`,
    [userId]
  );

  // 3. Avg water in 7 days
  const todayStr = toLocalDateKey();
  
  const weekAgoObj = new Date();
  weekAgoObj.setDate(weekAgoObj.getDate() - 7);
  const weekAgoStr = toLocalDateKey(weekAgoObj);

  const waterQuery = await db.getFirstAsync<{ avg_water: number }>(
    `SELECT COALESCE(AVG(daily_water), 0) as avg_water
     FROM (
       SELECT SUM(volume_ml) as daily_water
       FROM local_water_entries
       WHERE user_id = ? 
         AND logged_date BETWEEN ? AND ? 
         AND sync_status != 'deleted_pending'
       GROUP BY logged_date
     )`,
    [userId, weekAgoStr, todayStr]
  );

  // 4. Weight trend in 30 days
  const monthAgoObj = new Date();
  monthAgoObj.setDate(monthAgoObj.getDate() - 30);
  const monthAgoStr = toLocalDateKey(monthAgoObj);

  const weights30d = await db.getAllAsync<{ weight_kg: number, logged_date: string }>(
    `SELECT weight_kg, logged_date FROM local_weight_entries
     WHERE user_id = ? AND logged_date >= ? AND sync_status != 'deleted_pending'
     ORDER BY logged_date ASC`,
    [userId, monthAgoStr]
  );

  let trend: "up" | "down" | "stable" | "none" = "none";
  if (weights30d.length >= 2) {
    const first = weights30d[0].weight_kg;
    const last = weights30d[weights30d.length - 1].weight_kg;
    const diff = last - first;
    
    if (diff > 0.5) trend = "up";
    else if (diff < -0.5) trend = "down";
    else trend = "stable";
  }

  return {
    bmi: profile?.bmi || null,
    latest_weight_kg: latestWeight?.weight_kg || null,
    goal: profile?.goal || null,
    avg_water_7d_ml: Math.round(waterQuery?.avg_water || 0),
    weight_trend_30d: trend
  };
}
