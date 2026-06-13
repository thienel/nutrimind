/**
 * useWaterLog — hook quản lý water intake
 */

import { useCallback, useEffect, useState } from "react";
import {
  logWater,
  deleteWaterLog,
  getWaterByDate,
  getWaterHistory,
  getDailyWaterTotal,
  getDailyWaterHistory,
  InsertWaterData,
  WaterLog,
} from "@/lib/repositories/waterRepository";

interface UseWaterLogReturn {
  logs: WaterLog[];
  totalMl: number;
  isLoading: boolean;
  error: string | null;
  addWater(amountMl: number): Promise<string | null>;
  removeWater(id: string): Promise<void>;
  refresh(): void;
}

/**
 * Hook để log và xem water intake trong một ngày.
 *
 * @param userId  - ID user
 * @param date    - "YYYY-MM-DD", mặc định hôm nay
 */
export function useWaterLog(
  userId: number | null,
  date?: string
): UseWaterLogReturn {
  const today = new Date().toISOString().slice(0, 10);
  const targetDate = date ?? today;

  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [totalMl, setTotalMl] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    setIsLoading(true);

    Promise.all([
      getWaterByDate(userId, targetDate),
      getDailyWaterTotal(userId, targetDate),
    ])
      .then(([waterLogs, total]) => {
        if (cancelled) return;
        setLogs(waterLogs);
        setTotalMl(total);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e?.message ?? "Lỗi tải dữ liệu nước uống");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, targetDate, refreshTick]);

  const addWater = useCallback(
    async (amountMl: number): Promise<string | null> => {
      if (!userId) return null;
      try {
        const id = await logWater({ userId, amountMl });
        refresh();
        return id;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Lỗi lưu lượng nước";
        setError(msg);
        return null;
      }
    },
    [userId, refresh]
  );

  const removeWater = useCallback(
    async (id: string): Promise<void> => {
      if (!userId) return;
      try {
        await deleteWaterLog(id, userId);
        refresh();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Lỗi xóa";
        setError(msg);
      }
    },
    [userId, refresh]
  );

  return { logs, totalMl, isLoading, error, addWater, removeWater, refresh };
}

/**
 * Hook để lấy lịch sử water intake theo ngày (cho chart).
 */
export function useWaterHistory(userId: number | null, days = 7) {
  const [data, setData] = useState<{ date: string; amount_ml: number }[]>([]);

  useEffect(() => {
    if (!userId) return;
    getDailyWaterHistory(userId, days)
      .then(setData)
      .catch(() => setData([]));
  }, [userId, days]);

  return data;
}

/**
 * Hook để xem lịch sử đầy đủ của water logs.
 */
export function useWaterLogHistory(userId: number | null, limit = 30) {
  const [history, setHistory] = useState<WaterLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);
    getWaterHistory(userId, limit)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setIsLoading(false));
  }, [userId, limit]);

  return { history, isLoading };
}
