/**
 * SyncManager — drain sync_queue khi có mạng
 *
 * Chiến lược:
 *  - Lấy tất cả pending items từ sync_queue
 *  - Gọi API tương ứng theo action + entity
 *  - Nếu thành công: markSynced
 *  - Nếu thất bại: markFailed (tối đa 3 lần retry)
 *
 * API endpoints (placeholder — sẽ map với backend thực):
 *  POST   /nutrition/meals         — tạo meal
 *  DELETE /nutrition/meals/:id     — xóa meal
 *  POST   /nutrition/water-logs    — tạo water log
 *  DELETE /nutrition/water-logs/:id
 *  POST   /nutrition/weight-logs   — tạo weight log
 *  DELETE /nutrition/weight-logs/:id
 */

import { api } from "@/lib/apiClient";
import {
  getPending,
  markSynced,
  markFailed,
  clearSynced,
  SyncQueueItem,
} from "@/lib/repositories/syncQueue";

// Thời gian chờ giữa mỗi item (ms) — tránh flood server
const ITEM_DELAY_MS = 100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Xử lý một item trong sync_queue.
 */
async function processSyncItem(item: SyncQueueItem): Promise<void> {
  const payload = JSON.parse(item.payload) as Record<string, unknown>;

  if (item.action === "create") {
    if (item.entity === "meal") {
      await api.post("/nutrition/meals", payload);
    } else if (item.entity === "water") {
      await api.post("/nutrition/water-logs", payload);
    } else if (item.entity === "weight") {
      await api.post("/nutrition/weight-logs", payload);
    }
  } else if (item.action === "delete") {
    if (item.entity === "meal") {
      await api.delete(`/nutrition/meals/${item.local_id}`);
    } else if (item.entity === "water") {
      await api.delete(`/nutrition/water-logs/${item.local_id}`);
    } else if (item.entity === "weight") {
      await api.delete(`/nutrition/weight-logs/${item.local_id}`);
    }
  }
}

/**
 * Drain toàn bộ sync_queue.
 *
 * @param _userId Dùng để filter nếu cần (hiện tại không dùng vì apiClient tự attach token)
 * @returns Số lượng items còn lại (failed hoặc chờ retry)
 */
export async function startSync(_userId?: number): Promise<number> {
  let pending: SyncQueueItem[];

  try {
    pending = await getPending();
  } catch {
    return 0;
  }

  if (pending.length === 0) {
    await clearSynced();
    return 0;
  }

  let failedCount = 0;

  for (const item of pending) {
    try {
      await processSyncItem(item);
      await markSynced(item.id);
    } catch {
      await markFailed(item.id);
      failedCount++;
    }

    // Nhỏ delay giữa các requests
    await sleep(ITEM_DELAY_MS);
  }

  // Housekeeping: xóa records đã sync
  try {
    await clearSynced();
  } catch {
    // Ignore housekeeping errors
  }

  return failedCount;
}
