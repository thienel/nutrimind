/**
 * Barrel export for the db layer.
 * Import everything from '@/db' instead of individual files.
 */

// Schema types & SQL
export * from './schema';

// Database manager
export { DatabaseManager, DB_NAME } from './database';

// Repositories
export { ProfileRepository } from './repositories/profile.repo';
export { MealRepository } from './repositories/meal.repo';
export { WaterRepository } from './repositories/water.repo';
export { WeightRepository } from './repositories/weight.repo';
export { SyncQueueRepository } from './repositories/sync-queue.repo';