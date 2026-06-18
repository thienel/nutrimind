/**
 * syncQueue repository — quản lý hàng chờ đồng bộ với server
 *
 * Mỗi write offline sẽ tạo 1 item trong bảng sync_queue.
 * SyncManager sẽ drain queue khi mạng trở lại.
 */

import { getDb, generateUUID } from "@/lib/db";

export type SyncAction = "create" | "update" | "delete";
export type SyncEntity = "meal" | "water" | "weight";
export type SyncStatus = "pending" | "synced" | "failed";

export interface SyncQueueItem {
  id: string; // Map from TEXT id (UUID)
  action: SyncAction; // Maps to operation
  entity: SyncEntity; // Maps to entity_type
  local_id: string;
  payload: string; // JSON string
  status: SyncStatus;
  retries: number; // Maps to attempts
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
  const id = generateUUID();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO sync_queue (id, operation, entity_type, local_id, payload, status, attempts, max_attempts, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', 0, 3, ?);`,
    [id, action, entity, localId, JSON.stringify(payload), now]
  );
}

/** Lấy tất cả items đang pending (chưa sync, hoặc thất bại dưới 3 lần) */
export async function getPending(): Promise<SyncQueueItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM sync_queue
     WHERE status = 'pending' OR (status = 'failed' AND attempts < 3)
     ORDER BY created_at ASC;`
  );
  return rows.map((r) => ({
    id: r.id,
    action: r.operation as SyncAction,
    entity: r.entity_type as SyncEntity,
    local_id: r.local_id,
    payload: r.payload,
    status: r.status as SyncStatus,
    retries: r.attempts,
    created_at: r.created_at,
    synced_at: null,
  }));
}

/** Đánh dấu item đã sync thành công */
export async function markSynced(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE sync_queue
     SET status = 'synced'
     WHERE id = ?;`,
    [id]
  );
}

/** Đánh dấu item thất bại, tăng retry counter */
export async function markFailed(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE sync_queue
     SET status = 'failed', attempts = attempts + 1
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

