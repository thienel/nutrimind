import { useState, useEffect, useCallback } from 'react';
import { useDb } from './useDb';
import type { LocalMealEntry, MealType, FoodSource } from '../db/schema';
import { generateUUID, nowISO } from '../services/uuid';

interface AddMealParams {
  userId: number;
  food_name: string;
  meal_type: MealType;
  calories: number;
  protein_g?: number;
  carb_g?: number;
  fat_g?: number;
  source?: FoodSource;
  ai_confidence?: number;
}

interface UseMealEntriesResult {
  entries: LocalMealEntry[];
  isLoading: boolean;
  error: string | null;
  addMeal: (params: AddMealParams) => Promise<string>; // returns local_id
  deleteMeal: (localId: string) => Promise<void>;
  refresh: () => Promise<void>;
  totalCalories: number;
}

/**
 * Hook to manage meal entries for a specific user and date.
 * Handles local insert → sync_queue enqueue automatically.
 *
 * @example
 * const { entries, addMeal, deleteMeal, totalCalories } = useMealEntries(userId, '2024-01-15');
 */
export function useMealEntries(
  userId: number | null,
  date: string
): UseMealEntriesResult {
  const { mealRepo, syncQueue } = useDb();

  const [entries, setEntries] = useState<LocalMealEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setEntries([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await mealRepo.getMealEntriesByDate(userId, date);
      setEntries(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meals');
    } finally {
      setIsLoading(false);
    }
  }, [userId, date]);

  useEffect(() => {
    load();
  }, [load]);

  const addMeal = useCallback(
    async (params: AddMealParams): Promise<string> => {
      const now = nowISO();
      const localId = await generateUUID();

      const entry: Omit<LocalMealEntry, 'sync_status' | 'sync_attempts' | 'last_sync_error'> = {
        local_id: localId,
        server_id: null,
        user_id: params.userId,
        food_name: params.food_name,
        meal_type: params.meal_type,
        calories: params.calories,
        protein_g: params.protein_g ?? 0,
        carb_g: params.carb_g ?? 0,
        fat_g: params.fat_g ?? 0,
        source: params.source ?? 'MANUAL',
        ai_confidence: params.ai_confidence ?? null,
        logged_date: date,
        client_created_at: now,
        created_at: now,
      };

      // Insert to local DB
      await mealRepo.insertMealEntry(entry);

      // Enqueue for sync
      await syncQueue.enqueue({
        operation: 'CREATE',
        entity_type: 'meal',
        local_id: localId,
        payload: {
          food_name: entry.food_name,
          meal_type: entry.meal_type,
          calories: entry.calories,
          protein_g: entry.protein_g,
          carb_g: entry.carb_g,
          fat_g: entry.fat_g,
          source: entry.source,
          ai_confidence: entry.ai_confidence,
          logged_date: date,
          client_created_at: now,
        },
      });

      // Refresh UI
      await load();
      return localId;
    },
    [userId, date, mealRepo, syncQueue, load]
  );

  const deleteMeal = useCallback(
    async (localId: string): Promise<void> => {
      // Check if already has server_id → need to sync delete
      const entry = await mealRepo.getMealEntryById(localId);
      if (!entry) return;

      if (entry.server_id) {
        // Soft delete + enqueue DELETE
        await mealRepo.softDeleteMealEntry(localId);
        await syncQueue.enqueue({
          operation: 'DELETE',
          entity_type: 'meal',
          local_id: localId,
          payload: { server_id: entry.server_id },
        });
      } else {
        // Never synced → hard delete immediately
        await mealRepo.hardDeleteMealEntry(localId);
      }

      await load();
    },
    [mealRepo, syncQueue, load]
  );

  const totalCalories = entries.reduce((sum, e) => sum + e.calories, 0);

  return {
    entries,
    isLoading,
    error,
    addMeal,
    deleteMeal,
    refresh: load,
    totalCalories,
  };
}