import { useState, useEffect, useCallback } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { SyncQueueRepository } from "@/db/repositories/sync-queue.repo";
import { useNetwork } from "@/context/NetworkContext";
import type { SyncQueueItem, SyncQueueStatus } from "@/db/schema";

export function useSyncStatus() {
  const db = useSQLiteContext();
  const { triggerSync } = useNetwork();
  
  const [counts, setCounts] = useState<Record<SyncQueueStatus, number>>({
    pending: 0,
    processing: 0,
    done: 0,
    failed: 0,
    dismissed: 0,
  });
  const [failedItems, setFailedItems] = useState<SyncQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const repo = new SyncQueueRepository(db);
      const newCounts = await repo.countByStatus();
      setCounts(newCounts);
      
      if (newCounts.failed > 0) {
        // Sử dụng getAllFailedItems thay vì getRetryableItems để lấy toàn bộ danh sách lỗi
        const items = await repo.getAllFailedItems();
        setFailedItems(items);
      } else {
        setFailedItems([]);
      }
    } catch (e) {
      console.error("Failed to fetch sync status", e);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleRetryAll = async () => {
    const repo = new SyncQueueRepository(db);
    await repo.retryAllFailed();
    await fetchStatus();
    // Kích hoạt tiến trình sync qua NetworkContext
    triggerSync();
  };

  const handleDismissAll = async () => {
    const repo = new SyncQueueRepository(db);
    await repo.dismissAllFailed();
    await fetchStatus();
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
