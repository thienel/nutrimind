/**
 * useWeightLog — hook quản lý weight logging
 */

import { useCallback, useEffect, useState } from "react";
import { useNetwork } from "@/context/NetworkContext";
import {
  logWeight,
  deleteWeightLog,
  getWeightHistory,
  getLatestWeight,
  getWeightChartData,
  InsertWeightData,
  WeightLog,
} from "@/lib/repositories/weightRepository";

interface UseWeightLogReturn {
  history: WeightLog[];
  latestWeight: number | null;
  isLoading: boolean;
  error: string | null;
  addWeight(weightKg: number, note?: string): Promise<string | null>;
  removeWeight(id: string): Promise<void>;
  refresh(): void;
}

/**
 * Hook để log và xem lịch sử cân nặng.
 *
 * @param userId - ID user
 * @param limit  - Số bản ghi lịch sử tối đa
 */
export function useWeightLog(
  userId: number | null,
  limit = 30
): UseWeightLogReturn {
  const [history, setHistory] = useState<WeightLog[]>([]);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const { triggerSync } = useNetwork();

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  const numericUserId = userId ? Number(userId) : null;

  useEffect(() => {
    if (!numericUserId) return;

    let cancelled = false;
    setIsLoading(true);

    Promise.all([
      getWeightHistory(numericUserId, limit),
      getLatestWeight(numericUserId),
    ])
      .then(([logs, latest]) => {
        if (cancelled) return;
        setHistory(logs);
        setLatestWeight(latest?.weight_kg ?? null);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e?.message ?? "Lỗi tải lịch sử cân nặng");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [numericUserId, limit, refreshTick]);

  const addWeight = useCallback(
    async (weightKg: number, note?: string): Promise<string | null> => {
      if (!numericUserId) return null;
      try {
        const id = await logWeight({ userId: numericUserId, weightKg, note });
        refresh();
        triggerSync();
        return id;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Lỗi lưu cân nặng";
        setError(msg);
        return null;
      }
    },
    [numericUserId, refresh, triggerSync]
  );

  const removeWeight = useCallback(
    async (id: string): Promise<void> => {
      if (!numericUserId) return;
      try {
        await deleteWeightLog(id, numericUserId);
        refresh();
        triggerSync();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Lỗi xóa";
        setError(msg);
      }
    },
    [numericUserId, refresh, triggerSync]
  );

  return { history, latestWeight, isLoading, error, addWeight, removeWeight, refresh };
}

/**
 * Hook để lấy dữ liệu biểu đồ cân nặng.
 */
export function useWeightChart(userId: number | null, days = 30) {
  const [data, setData] = useState<{ date: string; weight_kg: number }[]>([]);

  const numericUserId = userId ? Number(userId) : null;

  useEffect(() => {
    if (!numericUserId) return;
    getWeightChartData(numericUserId, days)
      .then(setData)
      .catch(() => setData([]));
  }, [numericUserId, days]);

  return data;
}
