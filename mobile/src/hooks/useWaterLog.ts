/**
 * useWaterLog — hook quản lý water intake
 */

import { useCallback, useEffect, useState, useRef } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { useNetwork } from "@/context/NetworkContext";
import { fetchAndCacheDate } from "@/services/initialData.service";
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
  const today = new Date().toLocaleDateString('en-CA');
  const targetDate = date ?? today;

  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [totalMl, setTotalMl] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const db = useSQLiteContext();
  const { isOnline, triggerSync } = useNetwork();
  const fetchedDatesRef = useRef<Set<string>>(new Set());

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  const numericUserId = userId ? Number(userId) : null;

  useEffect(() => {
    if (!numericUserId) return;

    let cancelled = false;
    setIsLoading(true);

    const checkAndFetchOnDemand = async () => {
      try {
        const todayObj = new Date(today);
        const targetObj = new Date(targetDate);
        const diffDays = Math.floor((todayObj.getTime() - targetObj.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 7 && isOnline && !fetchedDatesRef.current.has(targetDate)) {
          fetchedDatesRef.current.add(targetDate);
          await fetchAndCacheDate(db, numericUserId, targetDate);
        }
      } catch (e) {
        console.warn("[useWaterLog] checkAndFetchOnDemand failed", e);
      }
    };

    checkAndFetchOnDemand().then(() => {
      return Promise.all([
        getWaterByDate(numericUserId, targetDate),
        getDailyWaterTotal(numericUserId, targetDate),
      ]);
    })
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
  }, [numericUserId, targetDate, refreshTick]);

  const addWater = useCallback(
    async (amountMl: number): Promise<string | null> => {
      if (!numericUserId) return null;
      try {
        const id = await logWater({ userId: numericUserId, amountMl });
        refresh();
        triggerSync();
        return id;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Lỗi lưu lượng nước";
        setError(msg);
        return null;
      }
    },
    [numericUserId, refresh, triggerSync]
  );

  const removeWater = useCallback(
    async (id: string): Promise<void> => {
      if (!numericUserId) return;
      try {
        await deleteWaterLog(id, numericUserId);
        refresh();
        triggerSync();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Lỗi xóa";
        setError(msg);
      }
    },
    [numericUserId, refresh, triggerSync]
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
