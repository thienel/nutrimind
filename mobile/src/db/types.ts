/** sync_status trên các bảng entry */
export type SyncStatus =
  | 'pending'
  | 'synced'
  | 'failed'
  | 'deleted_pending';

/** status trên sync_queue */
export type SyncQueueStatus =
  | 'pending'
  | 'processing'
  | 'done'
  | 'failed'
  | 'dismissed';

export type SyncOperation = 'CREATE' | 'DELETE';

export type EntityType = 'meal' | 'water' | 'weight';

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export type FoodSource = 'MANUAL' | 'AI_PHOTO';

/** Maps to: local_profile (singleton, id = 1) */
export interface LocalProfile {
  id: 1;
  user_id: number;
  display_name: string;
  avatar_url: string | null;
  age: number | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal: string | null;
  activity_level: string | null;
  bmi: number | null;
  bmr: number | null;
  tdee: number | null;
  calorie_target: number | null;
  protein_target_g: number | null;
  carb_target_g: number | null;
  fat_target_g: number | null;
  water_target_ml: number | null;
  social_enabled: 0 | 1;
  onboarding_done: 0 | 1;
  server_updated_at: string | null;
  cached_at: string | null;
}

/** Maps to: local_meal_entries */
export interface LocalMealEntry {
  local_id: string;          // UUID v4
  server_id: number | null;
  user_id: number;
  food_name: string;
  meal_type: MealType;
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  source: FoodSource;
  ai_confidence: number | null;
  logged_date: string;       // YYYY-MM-DD
  client_created_at: string; // ISO8601
  sync_status: SyncStatus;
  sync_attempts: number;
  last_sync_error: string | null;
  created_at: string;        // ISO8601
}

/** Maps to: local_water_entries */
export interface LocalWaterEntry {
  local_id: string;
  server_id: number | null;
  user_id: number;
  volume_ml: number;
  logged_date: string;
  client_created_at: string;
  sync_status: SyncStatus;
  sync_attempts: number;
  last_sync_error: string | null;
  created_at: string;
}

/** Maps to: local_weight_entries */
export interface LocalWeightEntry {
  local_id: string;
  server_id: number | null;
  user_id: number;
  weight_kg: number;
  logged_date: string;
  note: string | null;
  client_created_at: string;
  sync_status: SyncStatus;
  sync_attempts: number;
  last_sync_error: string | null;
  created_at: string;
}

/** Maps to: sync_queue */
export interface SyncQueueItem {
  id: string;              // UUID v4
  operation: SyncOperation;
  entity_type: EntityType;
  local_id: string;
  payload: string;         // JSON string
  status: SyncQueueStatus;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  created_at: string;
  next_retry_at: string | null;
}