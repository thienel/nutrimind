import type { SQLiteDatabase } from 'expo-sqlite';
import { MealRepository } from '../db/repositories/meal.repo';
import { WaterRepository } from '../db/repositories/water.repo';
import { WeightRepository } from '../db/repositories/weight.repo';
import { SyncQueueRepository } from '../db/repositories/sync-queue.repo';
import { ProfileRepository } from '../db/repositories/profile.repo';
import type { SyncQueueItem, EntityType } from '../db/schema';
import { api } from '@/lib/apiClient';
import { ApiClientError, ApiAuthError } from './errors';
import {
  WeightApi,
  MealApi,
  WaterApi,
} from './api.client';



interface WeightCreatePayload {
  weight_kg: number;
  logged_date: string;
  note?: string | null;
  client_created_at: string;
}

interface WeightDeletePayload {
  server_id: number;
}

interface MealCreatePayload {
  food_name: string;
  meal_type: string;
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  source: string;
  ai_confidence?: number | null;
  logged_date: string;
  client_created_at: string;
}

interface MealDeletePayload {
  server_id: number;
}

interface WaterCreatePayload {
  volume_ml: number;
  logged_date: string;
  client_created_at: string;
}

interface WaterDeletePayload {
  server_id: number;
}

export class SyncService {
  private queueRepo: SyncQueueRepository;
  private mealRepo: MealRepository;
  private waterRepo: WaterRepository;
  private weightRepo: WeightRepository;

  constructor(private db: SQLiteDatabase) {
    this.queueRepo = new SyncQueueRepository(db);
    this.mealRepo = new MealRepository(db);
    this.waterRepo = new WaterRepository(db);
    this.weightRepo = new WeightRepository(db);
  }

  /**
   * Run one sync cycle:
   * 1. Fetch pending + retryable items from sync_queue
   * 2. For each item, call the server API
   * 3. On success:  update entry sync_status → 'synced', mark queue 'done'
   * 4. On 4xx:      dismiss queue item, mark entry 'failed' (won't retry)
   * 5. On auth err: stop the cycle (user must re-login)
   * 6. On 5xx/net:  mark queue failed → exponential backoff applied
   *
   * Returns { synced, failed, skipped }
   */
  async runSync(): Promise<{ synced: number; failed: number; skipped: number }> {
    const pending = await this.queueRepo.getPendingItems(50);
    const retryable = await this.queueRepo.getRetryableItems();
    const items = [...pending, ...retryable];

    const result = { synced: 0, failed: 0, skipped: 0 };

    if (items.length === 0) {
      console.log('[SyncService] Nothing to sync');
      return result;
    }

    console.log(`[SyncService] Syncing ${items.length} item(s)`);

    for (const item of items) {
      const outcome = await this.processItem(item);
      if (outcome === 'synced') result.synced++;
      else if (outcome === 'failed') result.failed++;
      else if (outcome === 'skipped') result.skipped++;
      else if (outcome === 'auth_error') {
        // Stop the whole cycle — no point calling API without valid token
        console.warn('[SyncService] Auth error — stopping sync cycle');
        result.skipped += items.length - result.synced - result.failed - result.skipped - 1;
        break;
      }
    }

    // Prune old done/dismissed items
    await this.queueRepo.pruneCompleted(7);

    console.log(
      `[SyncService] Done — synced: ${result.synced}, failed: ${result.failed}, skipped: ${result.skipped}`
    );
    return result;
  }

  private async processItem(
    item: SyncQueueItem
  ): Promise<'synced' | 'failed' | 'skipped' | 'auth_error'> {
    let payload: unknown;
    try {
      payload = JSON.parse(item.payload);
    } catch {
      await this.queueRepo.dismiss(item.id);
      console.warn(`[SyncService] Invalid JSON for queue item ${item.id}`);
      return 'failed';
    }

    await this.queueRepo.markProcessing(item.id);

    try {
      const serverId = await this.callApi(item.entity_type, item.operation, payload);
      await this.queueRepo.markDone(item.id);
      await this.updateEntryAfterSuccess(item, serverId);
      return 'synced';
    } catch (err) {
      if (err instanceof ApiAuthError) {
        // Restore to pending so it retries after re-login
        await this.queueRepo.markFailed(item.id, err.message);
        return 'auth_error';
      }

      if (err instanceof ApiClientError) {
        if (err.status === 409 && item.operation === 'CREATE') {
          console.log(`[SyncService] 409 Conflict for ${item.entity_type} — resolving duplicate...`);
          try {
            let duplicateServerId: number | undefined;
            const p = JSON.parse(item.payload);

            if (item.entity_type === 'meal') {
              const mealsRes = await api.get<any>(`/meals?date=${p.logged_date}`);
              const mealsByType = mealsRes?.meals ?? {};
              const allMeals: any[] = [
                ...(mealsByType.breakfast ?? []),
                ...(mealsByType.lunch ?? []),
                ...(mealsByType.dinner ?? []),
                ...(mealsByType.snack ?? []),
              ];
              const existing = allMeals.find((m) => m.food_name === p.food_name && m.meal_type === p.meal_type);
              if (existing?.id) duplicateServerId = existing.id;
            } else if (item.entity_type === 'water') {
              const waterRes = await api.get<any>(`/water?date=${p.logged_date}`);
              const allWaters: any[] = waterRes?.entries ?? [];
              const existing = allWaters.find((w) => w.volume_ml === p.volume_ml);
              if (existing?.id) duplicateServerId = existing.id;
            } else if (item.entity_type === 'weight') {
              const weightRes = await api.get<any>('/health/weight?limit=7&offset=0');
              const allWeights: any[] = weightRes?.items ?? [];
              const existing = allWeights.find((w) => w.weight_kg === p.weight_kg);
              if (existing?.id) duplicateServerId = existing.id;
            }

            if (duplicateServerId) {
              await this.updateEntryAfterSuccess(item, duplicateServerId);
              await this.queueRepo.markDone(item.id);
              console.log(`[SyncService] Resolved 409: linked to server_id ${duplicateServerId}`);
              return 'synced';
            }
          } catch (e) {
            console.warn('[SyncService] Failed to recover from 409', e);
          }
        }

        // 4xx: non-retryable (e.g. 404, 422)
        const msg = err.message;
        await this.queueRepo.dismiss(item.id);
        await this.markEntryFailed(item.entity_type, item.local_id, msg);
        console.warn(`[SyncService] 4xx for ${item.id}: ${msg}`);
        return 'failed';
      }

      // Network / 5xx — retryable with exponential backoff
      const msg = err instanceof Error ? err.message : String(err);
      await this.queueRepo.markFailed(item.id, msg);
      await this.markEntryFailed(item.entity_type, item.local_id, msg);
      console.warn(`[SyncService] Retryable error for ${item.id}: ${msg}`);
      return 'failed';
    }
  }


  private async callApi(
    entityType: EntityType,
    operation: 'CREATE' | 'DELETE',
    payload: unknown
  ): Promise<number | undefined> {
    switch (entityType) {
      case 'weight': {
        if (operation === 'CREATE') {
          const p = payload as WeightCreatePayload;
          const res = await WeightApi.logWeight({
            date: p.logged_date,
            weight_kg: p.weight_kg,
            note: p.note ?? undefined,
          });
          return res.id;
        } else {
          const p = payload as WeightDeletePayload;
          await WeightApi.deleteWeight(p.server_id);
          return undefined;
        }
      }

      case 'meal': {
        if (operation === 'CREATE') {
          const p = payload as MealCreatePayload;
          const res = await MealApi.logMeal({
            food_name: p.food_name,
            // Backend yêu cầu enum CHỮ HOA (BREAKFAST/LUNCH/DINNER/SNACK).
            // Local DB lưu chữ thường nên phải chuẩn hoá khi gửi.
            meal_type: toBackendMealType(p.meal_type),
            calories: p.calories,
            protein_g: p.protein_g,
            carb_g: p.carb_g,
            fat_g: p.fat_g,
            // Backend yêu cầu MANUAL hoặc AI_PHOTO (chữ hoa).
            source: toBackendSource(p.source),
            ai_confidence: p.ai_confidence ?? undefined,
            logged_date: p.logged_date,
            client_created_at: p.client_created_at,
          });
          return res.id;
        } else {
          const p = payload as MealDeletePayload;
          await MealApi.deleteMeal(p.server_id);
          return undefined;
        }
      }

      // ── Water (stub — backend endpoint not yet available) ─
      case 'water': {
        if (operation === 'CREATE') {
          const p = payload as WaterCreatePayload;
          const res = await WaterApi.logWater({
            volume_ml: p.volume_ml,
            logged_date: p.logged_date,
            client_created_at: p.client_created_at,
          });
          return res.id;
        } else {
          const p = payload as WaterDeletePayload;
          await WaterApi.deleteWater(p.server_id);
          return undefined;
        }
      }

      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  // ─────────────────────────────────────────────────────────
  // Post-sync entry updates
  // ─────────────────────────────────────────────────────────

  private async updateEntryAfterSuccess(
    item: SyncQueueItem,
    serverId?: number
  ): Promise<void> {
    if (item.operation === 'DELETE') {
      // Server confirmed delete → hard delete locally
      switch (item.entity_type) {
        case 'meal': await this.mealRepo.hardDeleteMealEntry(item.local_id); break;
        case 'water': await this.waterRepo.hardDeleteWaterEntry(item.local_id); break;
        case 'weight': await this.weightRepo.hardDeleteWeightEntry(item.local_id); break;
      }
    } else {
      // CREATE synced → mark synced + store server_id
      switch (item.entity_type) {
        case 'meal':
          await this.mealRepo.updateMealSyncStatus(item.local_id, 'synced', serverId);
          break;
        case 'water':
          await this.waterRepo.updateWaterSyncStatus(item.local_id, 'synced', serverId);
          break;
        case 'weight':
          await this.weightRepo.updateWeightSyncStatus(item.local_id, 'synced', serverId);
          if (item.operation === 'CREATE') {
            try {
              const profileRepo = new ProfileRepository(this.db);
              const serverProfile = await api.get<any>("/profile");

              const currentUserId = serverProfile.user_id || 1;

              await profileRepo.upsertProfile({
                user_id: currentUserId,
                display_name: serverProfile.display_name ?? "",
                avatar_url: serverProfile.avatar_url ?? null,
                age: serverProfile.age ?? null,
                gender: serverProfile.gender ?? null,
                height_cm: serverProfile.height_cm ?? null,
                weight_kg: serverProfile.weight_kg ?? null,
                goal: serverProfile.goal ?? null,
                activity_level: serverProfile.activity_level ?? null,
                bmi: serverProfile.bmi ?? null,
                bmr: serverProfile.bmr ?? null,
                tdee: serverProfile.tdee ?? null,
                calorie_target: serverProfile.calorie_target ?? null,
                protein_target_g: serverProfile.protein_target_g ?? null,
                carb_target_g: serverProfile.carb_target_g ?? null,
                fat_target_g: serverProfile.fat_target_g ?? null,
                water_target_ml: serverProfile.water_target_ml ?? null,
                social_enabled: serverProfile.social_enabled ? 1 : 0,
                onboarding_done: serverProfile.onboarding_done ? 1 : 0,
                server_updated_at: new Date().toISOString(),
                cached_at: new Date().toISOString(),
              });
              console.log('[SyncService] Refreshed profile after weight update');
            } catch (e) {
              console.warn('[SyncService] Failed to refresh profile after weight sync', e);
            }
          }
          break;
      }
    }
  }

  private async markEntryFailed(
    entityType: EntityType,
    localId: string,
    error: string
  ): Promise<void> {
    switch (entityType) {
      case 'meal': await this.mealRepo.updateMealSyncStatus(localId, 'failed', undefined, error); break;
      case 'water': await this.waterRepo.updateWaterSyncStatus(localId, 'failed', undefined, error); break;
      case 'weight': await this.weightRepo.updateWeightSyncStatus(localId, 'failed', undefined, error); break;
    }
  }

  // ─────────────────────────────────────────────────────────
  // Utility
  // ─────────────────────────────────────────────────────────

  /** Returns pending item count — useful for UI sync badge */
  async getPendingCount(): Promise<number> {
    const counts = await this.queueRepo.countByStatus();
    return counts.pending + counts.processing;
  }
}

// ─────────────────────────────────────────────────────────
// Mapping local (lowercase) → backend enum (UPPERCASE)
// ─────────────────────────────────────────────────────────

/** Chuẩn hoá meal_type sang enum backend. "other" map về SNACK. */
function toBackendMealType(value: string): string {
  switch ((value || "").toLowerCase()) {
    case "breakfast":
      return "BREAKFAST";
    case "lunch":
      return "LUNCH";
    case "dinner":
      return "DINNER";
    case "snack":
      return "SNACK";
    default:
      return "SNACK"; // "other" hoặc giá trị lạ
  }
}

/** Chuẩn hoá source sang enum backend (MANUAL | AI_PHOTO). */
function toBackendSource(value: string): string {
  return (value || "").toLowerCase() === "ai_photo" ? "AI_PHOTO" : "MANUAL";
}