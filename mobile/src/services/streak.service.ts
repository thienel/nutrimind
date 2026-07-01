import { getDailyMeals, getDailyWater } from "./home.service";
import { getLocalDateKey } from "@/lib/dateUtils";
import type {
  StreakData,
  DailyMealsResponse,
  WaterDayResponse,
} from "@/app/(tabs)/home";

// =======================================================
// Dữ liệu streak mặc định (fallback)
// Nếu API lỗi thì UI vẫn có dữ liệu hiển thị
// =======================================================
const DEFAULT_STREAK: StreakData = {
  current: 6,
  weeklyProgress: [true, true, true, true, true, true, false],
};

// =======================================================
// Lấy streak hiện tại cho HomeScreen
// =======================================================
export async function getStreak(
  meals?: DailyMealsResponse | null,
  water?: WaterDayResponse | null,
): Promise<StreakData> {
  try {
    const today = getLocalDateKey();

    // =========================================================
    // Chỉ fetch những API chưa có dữ liệu từ HomeScreen
    // ?? giữ nguyên giá trị nếu không null/undefined
    // =========================================================
    const [mealsRes, waterRes] = await Promise.allSettled([
      meals ?? getDailyMeals(today),
      water ?? getDailyWater(today),
    ]);

    const finalMeals = mealsRes.status === "fulfilled" ? mealsRes.value : null;
    const finalWater = waterRes.status === "fulfilled" ? waterRes.value : null;

    // =========================================================
    // DEBUG: Log nguồn streak data
    // =========================================================
    console.log(
      "[StreakService] source meals=",
      finalMeals ? "API" : "null",
      "water=",
      finalWater ? "API" : "null",
    );

    // =========================================================
    // Kiểm tra user có log meal hoặc water hôm nay không
    // Nếu có ít nhất 1 bữa ăn hoặc 1 lần uống nước -> streak >= 1
    // =========================================================
    const hasMeal =
      (finalMeals?.meals?.breakfast?.length ?? 0) +
        (finalMeals?.meals?.lunch?.length ?? 0) +
        (finalMeals?.meals?.dinner?.length ?? 0) +
        (finalMeals?.meals?.snack?.length ?? 0) >
      0;

    const hasWater = (finalWater?.entries?.length ?? 0) > 0;

    // =========================================================
    // Nếu user có hoạt động hôm nay -> streak ít nhất 1
    // =========================================================
    if (hasMeal || hasWater) {
      const result: StreakData = {
        current: 1,
        weeklyProgress: DEFAULT_STREAK.weeklyProgress,
      };

      console.log("[StreakService] built from real data:", result);
      return result;
    }

    // =========================================================
    // Không có hoạt động hôm nay -> fallback DEFAULT_STREAK
    // =========================================================
    console.log("[StreakService] no activity today, using fallback");
    return DEFAULT_STREAK;
  } catch (err: any) {
    // Nếu API lỗi -> dùng fallback
    console.warn("[StreakService] Failed to load streak:", err);
    return DEFAULT_STREAK;
  }
}
