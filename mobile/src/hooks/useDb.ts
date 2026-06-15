import { useSQLiteContext } from 'expo-sqlite';
import { MealRepository } from '../db/repositories/meal.repo';
import { WaterRepository } from '../db/repositories/water.repo';
import { WeightRepository } from '../db/repositories/weight.repo';
import { ProfileRepository } from '../db/repositories/profile.repo';
import { SyncQueueRepository } from '../db/repositories/sync-queue.repo';

/**
 * Returns typed repository instances bound to the current SQLite context.
 *
 * Must be used inside a component wrapped by <SQLiteProvider>.
 *
 * @example
 * const { mealRepo, syncQueue } = useDb();
 */
export function useDb() {
  const db = useSQLiteContext();

  return {
    db,
    profileRepo:  new ProfileRepository(db),
    mealRepo:     new MealRepository(db),
    waterRepo:    new WaterRepository(db),
    weightRepo:   new WeightRepository(db),
    syncQueue:    new SyncQueueRepository(db),
  };
}
