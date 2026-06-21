import { getDb } from "@/lib/db";
import { toLocalDateKey } from "@/lib/dateUtils";

export interface DashboardData {
  calories: {
    logged: number;
    target: number;
  };
  protein: {
    logged: number;
    target: number;
  };
  carbs: {
    logged: number;
    target: number;
  };
  fat: {
    logged: number;
    target: number;
  };
  water: {
    logged_ml: number;
    target_ml: number;
  };
  weight: {
    latest_kg: number;
    days_ago: number;
  } | null;
}

export async function getDashboardData(userId: number, dateStr: string): Promise<DashboardData> {
  const db = await getDb();
  const dateOnly = toLocalDateKey(dateStr);

  // 1. Fetch Profile for targets
  const profile = await db.getFirstAsync<{
    calorie_target: number | null;
    protein_target_g: number | null;
    carb_target_g: number | null;
    fat_target_g: number | null;
    water_target_ml: number | null;
  }>(`SELECT * FROM local_profile WHERE user_id = ?`, [userId]);

  // Default targets if null
  const targets = {
    calories: profile?.calorie_target || 2000,
    protein: profile?.protein_target_g || 120,
    carbs: profile?.carb_target_g || 250,
    fat: profile?.fat_target_g || 65,
    water: profile?.water_target_ml || 2000,
  };

  // 2. Fetch Meals for today's sum
  const meals = await db.getFirstAsync<{
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
     WHERE user_id = ? AND logged_date = ? AND sync_status != 'deleted_pending'`,
    [userId, dateOnly]
  );

  // 3. Fetch Water for today's sum
  const water = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(volume_ml), 0) as total
     FROM local_water_entries
     WHERE user_id = ? AND logged_date = ? AND sync_status != 'deleted_pending'`,
    [userId, dateOnly]
  );

  // 4. Fetch Latest Weight
  const latestWeight = await db.getFirstAsync<{ weight_kg: number; logged_date: string }>(
    `SELECT weight_kg, logged_date FROM local_weight_entries
     WHERE user_id = ? AND sync_status != 'deleted_pending'
     ORDER BY logged_date DESC LIMIT 1`,
    [userId]
  );

  let weightData = null;
  if (latestWeight) {
    const todayObj = new Date(new Date().toLocaleDateString('en-CA'));
    const weightDateObj = new Date(latestWeight.logged_date);
    const diffDays = Math.floor((todayObj.getTime() - weightDateObj.getTime()) / (1000 * 60 * 60 * 24));
    
    weightData = {
      latest_kg: latestWeight.weight_kg,
      days_ago: diffDays < 0 ? 0 : diffDays,
    };
  }

  return {
    calories: { logged: meals?.cals || 0, target: targets.calories },
    protein: { logged: meals?.pro || 0, target: targets.protein },
    carbs: { logged: meals?.carb || 0, target: targets.carbs },
    fat: { logged: meals?.fat || 0, target: targets.fat },
    water: { logged_ml: water?.total || 0, target_ml: targets.water },
    weight: weightData,
  };
}
