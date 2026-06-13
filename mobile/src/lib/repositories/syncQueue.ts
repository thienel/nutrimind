/**
 * syncQueue repository — quản lý hàng chờ đồng bộ với server
 *
 * Mỗi write offline sẽ tạo 1 item trong bảng sync_queue.
 * SyncManager sẽ drain queue khi mạng trở lại.
 */

import { getDb } from "@/lib/db";

export type SyncAction = "create" | "update" | "delete";
export type SyncEntity = "meal" | "water" | "weight";
export type SyncStatus = "pending" | "synced" | "failed";

export interface SyncQueueItem {
  id: number;
  action: SyncAction;
  entity: SyncEntity;
  local_id: string;
  payload: string; // JSON string
  status: SyncStatus;
  retries: number;
  created_at: string;
  synced_at: string | null;
}

/** Thêm item mới vào sync_queue */
export async function enqueue(
  action: SyncAction,
  entity: SyncEntity,
  localId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO sync_queue (action, entity, local_id, payload, status)
     VALUES (?, ?, ?, ?, 'pending');`,
    [action, entity, localId, JSON.stringify(payload)]
  );
}

/** Lấy tất cả items đang pending (chưa sync, hoặc thất bại dưới 3 lần) */
export async function getPending(): Promise<SyncQueueItem[]> {
  const db = await getDb();
  return db.getAllAsync<SyncQueueItem>(
    `SELECT * FROM sync_queue
     WHERE status = 'pending' OR (status = 'failed' AND retries < 3)
     ORDER BY created_at ASC;`
  );
}

/** Đánh dấu item đã sync thành công */
export async function markSynced(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE sync_queue
     SET status = 'synced', synced_at = datetime('now')
     WHERE id = ?;`,
    [id]
  );
}

/** Đánh dấu item thất bại, tăng retry counter */
export async function markFailed(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE sync_queue
     SET status = 'failed', retries = retries + 1
     WHERE id = ?;`,
    [id]
  );
}

/** Xóa tất cả items đã sync (housekeeping) */
export async function clearSynced(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM sync_queue WHERE status = 'synced';`);
}

/** Đếm số items pending (để hiển thị badge nếu cần) */
export async function countPending(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending';`
  );
  return row?.count ?? 0;
}
