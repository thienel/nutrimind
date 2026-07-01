import { api } from "@/lib/apiClient";
import { getDb } from "@/lib/db";
import {
  getMealsByDate,
  getDailyMacros,
} from "@/lib/repositories/mealRepository";
import {
  getWaterByDate,
  getDailyWaterTotal,
} from "@/lib/repositories/waterRepository";
import type {
  HealthSummaryResponse,
  DailyMealsResponse,
  WaterDayResponse,
  AdviceResponse,
  MealEntryResponse,
  WaterEntryResponse,
} from "@/app/(tabs)/home";

// =========================
// HEALTH SUMMARY
// =========================
// Lấy dữ liệu tổng quan sức khỏe
export async function getHealthSummary(): Promise<HealthSummaryResponse | null> {
  try {
    return await api.get<HealthSummaryResponse>("/health/summary");
  } catch (err: any) {
    // Nếu API lỗi thì log warning và trả null
    // HomeScreen sẽ fallback sang profile data
    console.warn("[HomeService] Health summary fetch failed:", err);
    return null;
  }
}

// =========================
// DAILY MEALS
// =========================
// Lấy toàn bộ meal trong ngày hiện tại
// Dùng để tính calories + macro đã ăn
export async function getDailyMeals(
  date: string,
  userId?: number,
): Promise<DailyMealsResponse> {
  // Data fallback nếu API lỗi
  // Giúp UI không bị crash
  const defaultMeals: DailyMealsResponse = {
    date,
    meals: {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    },
    daily_totals: {
      calories: 0,
      protein_g: 0,
      carb_g: 0,
      fat_g: 0,
    },
  };

  try {
    const mealsData = await api.get<DailyMealsResponse>(`/meals?date=${date}`);

    // Nếu backend trả về empty totals, bổ sung từ local SQLite
    // → HomeScreen hiển thị đúng ngay cả khi sync chưa kịp chạy
    const hasBackendData =
      mealsData.daily_totals.calories > 0 ||
      Object.values(mealsData.meals).some((arr) => arr.length > 0);

    if (!hasBackendData && userId != null) {
      console.log(
        "[HomeService] Backend meals empty → falling back to local SQLite",
      );
      try {
        const db = await getDb();
        if (db) {
          const localMeals = await getMealsByDate(userId, date);
          const localMacros = await getDailyMacros(userId, date);

          const localByType: DailyMealsResponse["meals"] = {
            breakfast: [],
            lunch: [],
            dinner: [],
            snack: [],
          };

          for (const m of localMeals) {
            const entry: MealEntryResponse = {
              id: m.server_id ? Number(m.server_id) : 0,
              food_name: m.name,
              meal_type: m.meal_type,
              calories: m.calories,
              protein_g: m.protein_g,
              carb_g: m.carbs_g,
              fat_g: m.fat_g,
              source: "MANUAL",
              logged_date: date,
              created_at: m.created_at,
            };

            if (m.meal_type === "breakfast") localByType.breakfast.push(entry);
            else if (m.meal_type === "lunch") localByType.lunch.push(entry);
            else if (m.meal_type === "dinner") localByType.dinner.push(entry);
            else localByType.snack.push(entry);
          }

          return {
            date,
            meals: localByType,
            daily_totals: {
              calories: localMacros.calories,
              protein_g: localMacros.protein,
              carb_g: localMacros.carbs,
              fat_g: localMacros.fat,
            },
          };
        }
      } catch (localErr) {
        console.warn("[HomeService] Local SQLite fallback failed:", localErr);
      }
    }

    return mealsData;
  } catch (err: any) {
    // Nếu lỗi API, fallback sang local SQLite
    console.warn("[HomeService] Meals fetch failed:", err);
    if (userId != null) {
      try {
        const localMeals = await getMealsByDate(userId, date);
        const localMacros = await getDailyMacros(userId, date);

        const localByType: DailyMealsResponse["meals"] = {
          breakfast: [],
          lunch: [],
          dinner: [],
          snack: [],
        };

        for (const m of localMeals) {
          const entry: MealEntryResponse = {
            id: m.server_id ? Number(m.server_id) : 0,
            food_name: m.name,
            meal_type: m.meal_type,
            calories: m.calories,
            protein_g: m.protein_g,
            carb_g: m.carbs_g,
            fat_g: m.fat_g,
            source: "MANUAL",
            logged_date: date,
            created_at: m.created_at,
          };

          if (m.meal_type === "breakfast") localByType.breakfast.push(entry);
          else if (m.meal_type === "lunch") localByType.lunch.push(entry);
          else if (m.meal_type === "dinner") localByType.dinner.push(entry);
          else localByType.snack.push(entry);
        }

        return {
          date,
          meals: localByType,
          daily_totals: {
            calories: localMacros.calories,
            protein_g: localMacros.protein,
            carb_g: localMacros.carbs,
            fat_g: localMacros.fat,
          },
        };
      } catch (localErr) {
        console.warn(
          "[HomeService] Local SQLite fallback also failed:",
          localErr,
        );
      }
    }
    return defaultMeals;
  }
}

// =========================
// DAILY WATER
// =========================
// Lấy dữ liệu uống nước trong ngày
export async function getDailyWater(
  date: string,
  waterTargetMl: number = 2000,
  userId?: number,
): Promise<WaterDayResponse> {
  // Fallback nếu API fail
  const defaultWater: WaterDayResponse = {
    date,
    entries: [],
    daily_total_ml: 0,
    water_target_ml: waterTargetMl,
    total_ml: 0,
  };

  try {
    const waterData = await api.get<WaterDayResponse>(`/water?date=${date}`);

    // Nếu backend trả về 0, bổ sung từ local SQLite
    const totalFromBackend =
      waterData.daily_total_ml ?? waterData.total_ml ?? 0;
    const entriesFromBackend = waterData.entries ?? [];

    if (
      totalFromBackend === 0 &&
      entriesFromBackend.length === 0 &&
      userId != null
    ) {
      console.log(
        "[HomeService] Backend water empty → falling back to local SQLite",
      );
      try {
        const db = await getDb();
        if (db) {
          const localWaters = await getWaterByDate(userId, date);
          const localTotal = await getDailyWaterTotal(userId, date);

          const entries: WaterEntryResponse[] = localWaters.map((w) => ({
            id: w.server_id ? Number(w.server_id) : 0,
            volume_ml: w.amount_ml,
            created_at: w.created_at,
          }));

          return {
            date,
            entries,
            daily_total_ml: localTotal,
            water_target_ml: waterTargetMl,
            total_ml: localTotal,
          };
        }
      } catch (localErr) {
        console.warn(
          "[HomeService] Local water SQLite fallback failed:",
          localErr,
        );
      }
    }

    return waterData;
  } catch (err: any) {
    // Nếu lỗi API, fallback sang local SQLite
    console.warn("[HomeService] Water fetch failed:", err);
    if (userId != null) {
      try {
        const localWaters = await getWaterByDate(userId, date);
        const localTotal = await getDailyWaterTotal(userId, date);

        const entries: WaterEntryResponse[] = localWaters.map((w) => ({
          id: w.server_id ? Number(w.server_id) : 0,
          volume_ml: w.amount_ml,
          created_at: w.created_at,
        }));

        return {
          date,
          entries,
          daily_total_ml: localTotal,
          water_target_ml: waterTargetMl,
          total_ml: localTotal,
        };
      } catch (localErr) {
        console.warn(
          "[HomeService] Local water fallback also failed:",
          localErr,
        );
      }
    }
    return defaultWater;
  }
}

// =========================
// AI ADVICE
// =========================
// Gọi AI backend để lấy lời khuyên dinh dưỡng
export async function getAiAdvice(): Promise<AdviceResponse | null> {
  try {
    return await api.post<AdviceResponse>("/ai/advice", {});
  } catch (err: any) {
    // Nếu user chưa onboarding xong
    // backend sẽ chặn AI advice
    if (err?.status === 403) {
      console.warn(
        "[HomeService] AI advice blocked (ONBOARDING_REQUIRED 403):",
        err,
      );
    } else {
      console.warn("[HomeService] AI advice fetch failed:", err);
    }

    // Trả null để UI fallback
    return null;
  }
}
