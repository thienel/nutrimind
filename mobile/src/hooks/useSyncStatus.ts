import { useState, useEffect, useCallback, useRef } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { SyncQueueRepository } from "@/db/repositories/sync-queue.repo";
import { useNetwork } from "@/context/NetworkContext";
import { useAuth } from "@/context/AuthContext";
import type { SyncQueueItem, SyncQueueStatus } from "@/db/schema";

export function useSyncStatus() {
  const db = useSQLiteContext();
  const { triggerSync } = useNetwork();
  const { isHydrated, user } = useAuth();

  const [counts, setCounts] = useState<Record<SyncQueueStatus, number>>({
    pending: 0,
    processing: 0,
    done: 0,
    failed: 0,
    dismissed: 0,
  });
  const [failedItems, setFailedItems] = useState<SyncQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchStatus = useCallback(async () => {
    // Guard: SQLite db có thể chưa sẵn sàng
    if (!db) {
      console.warn("[useSyncStatus] fetchStatus skipped — db not ready");
      return;
    }

    // Guard: chờ auth hydration hoàn tất và user tồn tại
    if (!isHydrated || !user) {
      console.warn("[useSyncStatus] fetchStatus skipped — auth not ready");
      return;
    }

    // Mounted guard: không update state sau khi unmount
    if (!mountedRef.current) return;

    try {
      const repo = new SyncQueueRepository(db);
      const newCounts = await repo.countByStatus();
      if (!mountedRef.current) return;
      setCounts(newCounts);

      if (newCounts.failed > 0) {
        // Sử dụng getAllFailedItems thay vì getRetryableItems để lấy toàn bộ danh sách lỗi
        const items = await repo.getAllFailedItems();
        if (!mountedRef.current) return;
        setFailedItems(items);
      } else {
        if (!mountedRef.current) return;
        setFailedItems([]);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      console.error("Failed to fetch sync status", e);
    }
  }, [db, isHydrated, user]);

  useEffect(() => {
    mountedRef.current = true;

    async function load() {
      setIsLoading(true);
      await fetchStatus();
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }

    load();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchStatus]);

  const handleRetryAll = async () => {
    if (!db || !isHydrated || !user) {
      console.warn(
        "[useSyncStatus] handleRetryAll skipped — preconditions not met",
      );
      return;
    }
    if (!mountedRef.current) return;

    try {
      const repo = new SyncQueueRepository(db);
      await repo.retryAllFailed();
      if (mountedRef.current) {
        await fetchStatus();
        // Kích hoạt tiến trình sync qua NetworkContext
        triggerSync();
      }
    } catch (e) {
      if (mountedRef.current) {
        console.error("[useSyncStatus] handleRetryAll failed:", e);
      }
    }
  };

  const handleDismissAll = async () => {
    if (!db || !isHydrated || !user) {
      console.warn(
        "[useSyncStatus] handleDismissAll skipped — preconditions not met",
      );
      return;
    }
    if (!mountedRef.current) return;

    try {
      const repo = new SyncQueueRepository(db);
      await repo.dismissAllFailed();
      if (mountedRef.current) {
        await fetchStatus();
      }
    } catch (e) {
      if (mountedRef.current) {
        console.error("[useSyncStatus] handleDismissAll failed:", e);
      }
    }
  };

  return {
    counts,
    failedItems,
    isLoading,
    handleRetryAll,
    handleDismissAll,
    refresh: fetchStatus,
  };
}
