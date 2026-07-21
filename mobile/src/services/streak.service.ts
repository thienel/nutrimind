import { getLocalDateKey } from "@/lib/dateUtils";
import { api } from "@/lib/apiClient";
import type {
  StreakData,
  DailyMealsResponse,
  WaterDayResponse,
} from "@/app/(tabs)/home";

// =======================================================
// Dữ liệu streak mặc định (fallback)
// =======================================================
const DEFAULT_STREAK: StreakData = {
  current: 0,
  weeklyProgress: [false, false, false, false, false, false, false],
};

// =======================================================
// Lấy streak hiện tại cho HomeScreen.
// Tính streak thực tế từ water history API (GET /water/history).
// =======================================================
export async function getStreak(
  meals?: DailyMealsResponse | null,
  water?: WaterDayResponse | null,
): Promise<StreakData> {
  try {
    const today = getLocalDateKey();

    // Tính ngày bắt đầu (7 ngày trước)
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 6);
    const fromStr = fromDate.toLocaleDateString("en-CA");

    // Fetch water history 7 ngày
    let waterHistory: { date: string; total_ml: number }[] = [];
    try {
      const res = await api.get<{
        items: { date: string; total_ml: number }[];
      }>(`/water/history?from=${fromStr}&to=${today}`);
      waterHistory = res?.items ?? [];
    } catch {
      console.warn("[StreakService] Water history fetch failed, using local data");
    }

    // Tạo map ngày → has activity
    const activityMap = new Map<string, boolean>();

    // Từ water history
    for (const item of waterHistory) {
      if (item.total_ml > 0) {
        activityMap.set(item.date, true);
      }
    }

    // Cũng check today data từ meal/water local
    const hasMeal =
      (meals?.meals?.breakfast?.length ?? 0) +
        (meals?.meals?.lunch?.length ?? 0) +
        (meals?.meals?.dinner?.length ?? 0) +
        (meals?.meals?.snack?.length ?? 0) > 0;
    const hasWater = (water?.daily_total_ml ?? 0) > 0;

    if (hasMeal || hasWater) {
      activityMap.set(today, true);
    }

    // Tính streak: đếm số ngày liên tiếp từ today ngược về có activity
    let current = 0;
    const weeklyProgress: boolean[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toLocaleDateString("en-CA");
      const hasActivity = activityMap.get(dateKey) === true;
      weeklyProgress.unshift(hasActivity);

      if (i === 0) {
        // Today
        if (hasActivity) {
          current = 1;
        }
      } else if (current > 0 && hasActivity) {
        current++;
      } else if (!hasActivity && current > 0) {
        // Streak đã bị đứt, không tăng nữa nhưng vẫn giữ current
        // (chỉ break streak counting, không reset về 0)
      }
    }

    const finalStreak = current > 0 ? current : 0;

    console.log(
      `[StreakService] Calculated streak: ${finalStreak} days, weeklyProgress=`,
      weeklyProgress,
    );

    return {
      current: finalStreak,
      weeklyProgress,
    };
  } catch (err: any) {
    console.warn("[StreakService] Failed to load streak:", err);
    return DEFAULT_STREAK;
  }
}
