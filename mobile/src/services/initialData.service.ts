import type { SQLiteDatabase } from "expo-sqlite";
import { api } from "@/lib/apiClient";
import { ProfileRepository } from "../db/repositories/profile.repo";
import { generateUUID } from "@/lib/db";

export async function pullInitialData(db: SQLiteDatabase, userId: number) {
  const profileRepo = new ProfileRepository(db);

  console.log("[InitialData] Pulling initial data from server...");

  // 1. Profile
  const pProfile = api.get<any>("/profile").then(async (serverProfile) => {
    await profileRepo.upsertProfile({
      user_id: userId,
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
  }).catch((err) => console.warn("[InitialData] Failed to pull profile", err));

  // Helper cho date
  const getDateStr = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toLocaleDateString("en-CA");
  };

  const today = new Date().toISOString();

  // 2. Meals (7 ngày gần nhất)
  const pMeals = Promise.all(
    Array.from({ length: 7 }).map(async (_, i) => {
      const dateStr = getDateStr(i);
      try {
        const meals = await api.get<any[]>(`/meals?date=${dateStr}`);
        if (Array.isArray(meals)) {
          for (const m of meals) {
            if (!m.id) continue;
            // Check trùng
            const existing = await db.getFirstAsync<{ local_id: string }>(
              "SELECT local_id FROM local_meal_entries WHERE server_id = ?",
              [m.id]
            );
            if (!existing) {
              await db.runAsync(
                `INSERT INTO local_meal_entries (
                  local_id, server_id, user_id, food_name, meal_type,
                  calories, protein_g, carb_g, fat_g, source, ai_confidence,
                  logged_date, client_created_at, sync_status, sync_attempts, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', 0, ?)`,
                [
                  generateUUID(), m.id, userId, m.food_name || "Unknown",
                  m.meal_type || "OTHER", m.calories || 0, m.protein_g || 0,
                  m.carb_g || 0, m.fat_g || 0, m.source || "MANUAL",
                  m.ai_confidence ?? null, m.logged_date || dateStr,
                  m.client_created_at || today, today,
                ]
              );
            }
          }
        }
      } catch (err) {
        console.warn(`[InitialData] Failed to pull meals for ${dateStr}`, err);
      }
    })
  );

  // 3. Water (7 ngày gần nhất)
  const pWater = Promise.all(
    Array.from({ length: 7 }).map(async (_, i) => {
      const dateStr = getDateStr(i);
      try {
        const waters = await api.get<any[]>(`/water?date=${dateStr}`);
        if (Array.isArray(waters)) {
          for (const w of waters) {
            if (!w.id) continue;
            const existing = await db.getFirstAsync<{ local_id: string }>(
              "SELECT local_id FROM local_water_entries WHERE server_id = ?",
              [w.id]
            );
            if (!existing) {
              await db.runAsync(
                `INSERT INTO local_water_entries (
                  local_id, server_id, user_id, volume_ml, logged_date,
                  client_created_at, sync_status, sync_attempts, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'synced', 0, ?)`,
                [
                  generateUUID(), w.id, userId, w.volume_ml || 0,
                  w.logged_date || dateStr, w.client_created_at || today, today,
                ]
              );
            }
          }
        }
      } catch (err) {
        console.warn(`[InitialData] Failed to pull water for ${dateStr}`, err);
      }
    })
  );

  // 4. Weight (90 ngày)
  const pWeight = api.get<any[]>("/health/weight?limit=90&offset=0").then(async (weights) => {
    if (Array.isArray(weights)) {
      for (const w of weights) {
        if (!w.id) continue;
        const existing = await db.getFirstAsync<{ local_id: string }>(
          "SELECT local_id FROM local_weight_entries WHERE server_id = ?",
          [w.id]
        );
        if (!existing) {
          await db.runAsync(
            `INSERT INTO local_weight_entries (
              local_id, server_id, user_id, weight_kg, logged_date, note,
              client_created_at, sync_status, sync_attempts, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', 0, ?)`,
            [
              generateUUID(), w.id, userId, w.weight_kg || 0,
              w.logged_at || today.slice(0, 10), w.note || null,
              w.client_created_at || today, today,
            ]
          );
        }
      }
    }
  }).catch((err) => console.warn("[InitialData] Failed to pull weights", err));

  await Promise.all([pProfile, pMeals, pWater, pWeight]);
  console.log("[InitialData] Pull completed.");
}

/**
 * Hàm On-Demand Fetch (Mục 9.6)
 * Kéo dữ liệu của một ngày cụ thể từ server về cache vào SQLite.
 * @param dateStr dạng "YYYY-MM-DD"
 */
export async function fetchAndCacheDate(db: SQLiteDatabase, userId: number, dateStr: string) {
  console.log(`[InitialData] On-demand fetching for ${dateStr}...`);
  const today = new Date().toISOString();

  try {
    // 1. Fetch Meals
    const meals = await api.get<any[]>(`/meals?date=${dateStr}`);
    if (Array.isArray(meals)) {
      for (const m of meals) {
        if (!m.id) continue;
        const existing = await db.getFirstAsync<{ local_id: string }>(
          "SELECT local_id FROM local_meal_entries WHERE server_id = ?",
          [m.id]
        );
        if (!existing) {
          await db.runAsync(
            `INSERT INTO local_meal_entries (
              local_id, server_id, user_id, food_name, meal_type,
              calories, protein_g, carb_g, fat_g, source, ai_confidence,
              logged_date, client_created_at, sync_status, sync_attempts, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', 0, ?)`,
            [
              generateUUID(), m.id, userId, m.food_name || "Unknown",
              m.meal_type || "OTHER", m.calories || 0, m.protein_g || 0,
              m.carb_g || 0, m.fat_g || 0, m.source || "MANUAL",
              m.ai_confidence ?? null, m.logged_date || dateStr,
              m.client_created_at || today, today,
            ]
          );
        }
      }
    }

    // 2. Fetch Water
    const waters = await api.get<any[]>(`/water?date=${dateStr}`);
    if (Array.isArray(waters)) {
      for (const w of waters) {
        if (!w.id) continue;
        const existing = await db.getFirstAsync<{ local_id: string }>(
          "SELECT local_id FROM local_water_entries WHERE server_id = ?",
          [w.id]
        );
        if (!existing) {
          await db.runAsync(
            `INSERT INTO local_water_entries (
              local_id, server_id, user_id, volume_ml, logged_date,
              client_created_at, sync_status, sync_attempts, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'synced', 0, ?)`,
            [
              generateUUID(), w.id, userId, w.volume_ml || 0,
              w.logged_date || dateStr, w.client_created_at || today, today,
            ]
          );
        }
      }
    }
  } catch (err) {
    console.warn(`[InitialData] On-demand fetch failed for ${dateStr}`, err);
  }
}
