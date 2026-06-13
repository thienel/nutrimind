/**
 * useMealLog — hook quản lý meal entries
 *
 * - Đọc/ghi từ SQLite (hoạt động offline hoàn toàn)
 * - Auto-reload khi date thay đổi
 * - Expose loading/error states cho UI
 */

import { useCallback, useEffect, useState } from "react";
import {
  insertMeal,
  deleteMeal,
  getMealsByDate,
  getMealHistory,
  getDailyMacros,
  getDailyCalorieHistory,
  InsertMealData,
  MealEntry,
} from "@/lib/repositories/mealRepository";

export interface DailyMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface UseMealLogReturn {
  meals: MealEntry[];
  macros: DailyMacros;
  isLoading: boolean;
  error: string | null;
  logMeal(data: Omit<InsertMealData, "userId">): Promise<string | null>;
  removeMeal(id: string): Promise<void>;
  refresh(): void;
}

/**
 * Hook để log và xem meals trong một ngày cụ thể.
 *
 * @param userId  - ID của user đang đăng nhập
 * @param date    - "YYYY-MM-DD", mặc định hôm nay
 */
export function useMealLog(
  userId: number | null,
  date?: string
): UseMealLogReturn {
  const today = new Date().toISOString().slice(0, 10);
  const targetDate = date ?? today;

  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [macros, setMacros] = useState<DailyMacros>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      getMealsByDate(userId, targetDate),
      getDailyMacros(userId, targetDate),
    ])
      .then(([mealList, dailyMacros]) => {
        if (cancelled) return;
        setMeals(mealList);
        setMacros(dailyMacros);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e?.message ?? "Lỗi tải dữ liệu bữa ăn");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, targetDate, refreshTick]);

  const logMeal = useCallback(
    async (data: Omit<InsertMealData, "userId">): Promise<string | null> => {
      if (!userId) return null;
      try {
        const id = await insertMeal({ ...data, userId });
        refresh();
        return id;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Lỗi lưu bữa ăn";
        setError(msg);
        return null;
      }
    },
    [userId, refresh]
  );

  const removeMeal = useCallback(
    async (id: string): Promise<void> => {
      if (!userId) return;
      try {
        await deleteMeal(id, userId);
        refresh();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Lỗi xóa bữa ăn";
        setError(msg);
      }
    },
    [userId, refresh]
  );

  return { meals, macros, isLoading, error, logMeal, removeMeal, refresh };
}

/**
 * Hook để xem lịch sử toàn bộ meals (không theo ngày).
 */
export function useMealHistory(userId: number | null, limit = 50) {
  const [history, setHistory] = useState<MealEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);
    getMealHistory(userId, limit)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setIsLoading(false));
  }, [userId, limit]);

  return { history, isLoading };
}

/**
 * Hook để lấy lịch sử calories theo ngày (cho chart).
 */
export function useCalorieHistory(userId: number | null, days = 7) {
  const [data, setData] = useState<{ date: string; calories: number }[]>([]);

  useEffect(() => {
    if (!userId) return;
    getDailyCalorieHistory(userId, days)
      .then(setData)
      .catch(() => setData([]));
  }, [userId, days]);

  return data;
}
