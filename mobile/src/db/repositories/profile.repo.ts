import type { SQLiteDatabase } from 'expo-sqlite';
import type { LocalProfile } from '../schema';

/**
 * Repository for local_profile table (singleton row, id = 1).
 */
export class ProfileRepository {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Upsert the single profile row.
   * Uses INSERT OR REPLACE to handle both first-time insert and updates.
   */
  async upsertProfile(
    profile: Omit<LocalProfile, 'id'> & { id?: 1 }
  ): Promise<void> {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO local_profile (
        id, user_id, display_name, avatar_url, age, gender,
        height_cm, weight_kg, goal, activity_level,
        bmi, bmr, tdee, calorie_target,
        protein_target_g, carb_target_g, fat_target_g, water_target_ml,
        social_enabled, onboarding_done, server_updated_at, cached_at
      ) VALUES (
        1, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?
      )`,
      [
        profile.user_id,
        profile.display_name,
        profile.avatar_url ?? null,
        profile.age ?? null,
        profile.gender ?? null,
        profile.height_cm ?? null,
        profile.weight_kg ?? null,
        profile.goal ?? null,
        profile.activity_level ?? null,
        profile.bmi ?? null,
        profile.bmr ?? null,
        profile.tdee ?? null,
        profile.calorie_target ?? null,
        profile.protein_target_g ?? null,
        profile.carb_target_g ?? null,
        profile.fat_target_g ?? null,
        profile.water_target_ml ?? null,
        profile.social_enabled,
        profile.onboarding_done,
        profile.server_updated_at ?? null,
        profile.cached_at ?? null,
      ]
    );
  }

  /**
   * Get the single profile row (id = 1), or null if not set yet.
   */
  async getProfile(): Promise<LocalProfile | null> {
    const row = await this.db.getFirstAsync<LocalProfile>(
      'SELECT * FROM local_profile WHERE id = 1'
    );
    return row ?? null;
  }

  /**
   * Update a partial set of profile fields (e.g. onboarding_done).
   */
  async patchProfile(
    fields: Partial<Omit<LocalProfile, 'id' | 'user_id'>>
  ): Promise<void> {
    const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return;

    const setClauses = entries.map(([k]) => `${k} = ?`).join(', ');
    const values = entries.map(([, v]) => v);

    await this.db.runAsync(
      `UPDATE local_profile SET ${setClauses} WHERE id = 1`,
      values as any[]
    );
  }

  /**
   * Delete the profile row (e.g. on logout).
   */
  async clearProfile(): Promise<void> {
    await this.db.runAsync('DELETE FROM local_profile WHERE id = 1');
  }
}