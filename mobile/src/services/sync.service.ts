import type { SQLiteDatabase } from 'expo-sqlite';
import { MealRepository } from '../db/repositories/meal.repo';
import { WaterRepository } from '../db/repositories/water.repo';
import { WeightRepository } from '../db/repositories/weight.repo';
import { SyncQueueRepository } from '../db/repositories/sync-queue.repo';
import type { SyncQueueItem, EntityType } from '../db/schema';
import { ApiClientError, ApiAuthError } from './errors';
import {
  WeightApi,
  // MealApi,   // TODO: uncomment when backend adds /api/meal-entries
  // WaterApi,  // TODO: uncomment when backend adds /api/water-entries
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

  // ─────────────────────────────────────────────────────────
  // Dispatch API call by entity type
  // ─────────────────────────────────────────────────────────

  private async callApi(
    entityType: EntityType,
    operation: 'CREATE' | 'DELETE',
    payload: unknown
  ): Promise<number | undefined> {
    switch (entityType) {
      // ── Weight (wired) ────────────────────────────────────
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

      // ── Meal (stub — backend endpoint not yet available) ──
      case 'meal': {
        if (operation === 'CREATE') {
          // TODO: uncomment when backend adds POST /api/meal-entries
          // const p = payload as MealCreatePayload;
          // const res = await MealApi.logMeal({
          //   food_name: p.food_name,
          //   meal_type: p.meal_type as any,
          //   calories: p.calories,
          //   protein_g: p.protein_g,
          //   carb_g: p.carb_g,
          //   fat_g: p.fat_g,
          //   source: p.source as any,
          //   ai_confidence: p.ai_confidence ?? undefined,
          //   logged_date: p.logged_date,
          //   client_created_at: p.client_created_at,
          // });
          // return res.id;
          console.log('[SyncService] Meal sync skipped — endpoint not implemented yet');
          throw new Error('MEAL_ENDPOINT_NOT_IMPLEMENTED');
        } else {
          // TODO: uncomment when backend adds DELETE /api/meal-entries/:id
          // const p = payload as MealDeletePayload;
          // await MealApi.deleteMeal(p.server_id);
          console.log('[SyncService] Meal delete sync skipped — endpoint not implemented yet');
          throw new Error('MEAL_ENDPOINT_NOT_IMPLEMENTED');
        }
      }

      // ── Water (stub — backend endpoint not yet available) ─
      case 'water': {
        if (operation === 'CREATE') {
          // TODO: uncomment when backend adds POST /api/water-entries
          // const p = payload as WaterCreatePayload;
          // const res = await WaterApi.logWater({
          //   volume_ml: p.volume_ml,
          //   logged_date: p.logged_date,
          //   client_created_at: p.client_created_at,
          // });
          // return res.id;
          console.log('[SyncService] Water sync skipped — endpoint not implemented yet');
          throw new Error('WATER_ENDPOINT_NOT_IMPLEMENTED');
        } else {
          // TODO: uncomment when backend adds DELETE /api/water-entries/:id
          // const p = payload as WaterDeletePayload;
          // await WaterApi.deleteWater(p.server_id);
          console.log('[SyncService] Water delete sync skipped — endpoint not implemented yet');
          throw new Error('WATER_ENDPOINT_NOT_IMPLEMENTED');
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
        case 'meal':   await this.mealRepo.hardDeleteMealEntry(item.local_id); break;
        case 'water':  await this.waterRepo.hardDeleteWaterEntry(item.local_id); break;
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
      case 'meal':   await this.mealRepo.updateMealSyncStatus(localId, 'failed', undefined, error); break;
      case 'water':  await this.waterRepo.updateWaterSyncStatus(localId, 'failed', undefined, error); break;
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