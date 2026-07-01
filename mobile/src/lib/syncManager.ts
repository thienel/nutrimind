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
import { getDb } from "@/lib/db";
import {
  updateMealServerId,
  getMealServerId,
} from "@/lib/repositories/mealRepository";
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
  const db = await getDb();

  if (item.action === "create") {
    if (item.entity === "meal") {
      let mealType = (payload.meal_type as string || "snack").toUpperCase();
      if (mealType !== "BREAKFAST" && mealType !== "LUNCH" && mealType !== "DINNER") {
        mealType = "SNACK";
      }
      const body = {
        food_name: String(payload.food_name ?? payload.name ?? ""),
        meal_type: mealType,
        calories: Number(payload.calories),
        protein_g: Number(payload.protein_g ?? 0),
        carb_g: Number(payload.carb_g ?? 0),
        fat_g: Number(payload.fat_g ?? 0),
        source: String(payload.source ?? "MANUAL"),
        logged_date: String(payload.logged_date ?? ""),
        client_created_at: String(payload.client_created_at ?? ""),
      };
      const res = await api.post<{ id: number }>("/meals", body);
      if (res && res.id) {
        await updateMealServerId(item.local_id, String(res.id));
      }
    } else if (item.entity === "water") {
      const body = {
        volume_ml: Number(payload.volume_ml),
        logged_date: String(payload.logged_date ?? ""),
        client_created_at: String(payload.client_created_at ?? payload.logged_at ?? ""),
      };
      const res = await api.post<{ id: number }>("/water", body);
      if (res && res.id) {
        await db.runAsync(
          `UPDATE local_water_entries
           SET server_id = ?, sync_status = 'synced'
           WHERE local_id = ?;`,
          [res.id, item.local_id]
        );
      }
    } else if (item.entity === "weight") {
      const body = {
        weight_kg: Number(payload.weight_kg),
        logged_at: String(payload.logged_date ?? payload.logged_at ?? ""),
        note: (payload.note as string) || "",
        client_created_at: String(payload.client_created_at ?? payload.logged_at ?? ""),
      };
      const res = await api.post<{ id: number }>("/health/weight", body);
      if (res && res.id) {
        await db.runAsync(
          `UPDATE local_weight_entries
           SET server_id = ?, sync_status = 'synced'
           WHERE local_id = ?;`,
          [res.id, item.local_id]
        );
      }
    }
  } else if (item.action === "delete") {
    if (item.entity === "meal") {
      const serverId = await getMealServerId(item.local_id);
      if (serverId) {
        await api.delete(`/meals/${serverId}`);
      }
    } else if (item.entity === "water") {
      const row = await db.getFirstAsync<{ server_id: number }>(
        `SELECT server_id FROM local_water_entries WHERE local_id = ?;`,
        [item.local_id]
      );
      if (row?.server_id) {
        await api.delete(`/water/${row.server_id}`);
      }
      await db.runAsync(
        `DELETE FROM local_water_entries WHERE local_id = ?;`,
        [item.local_id]
      );
    } else if (item.entity === "weight") {
      // No server weight deletion route exists. Just delete locally
      await db.runAsync(
        `DELETE FROM local_weight_entries WHERE local_id = ?;`,
        [item.local_id]
      );
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
