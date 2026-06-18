import AsyncStorage from "@react-native-async-storage/async-storage";
import { enqueue } from "@/lib/repositories/syncQueue";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "other";

export interface MealEntry {
  id: string;
  user_id: number;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_type: MealType;
  logged_at: string;
  created_at: string;
  is_deleted: number;
  server_id: string | null;
}

export interface InsertMealData {
  userId: number;
  name: string;
  calories: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  mealType?: MealType;
  loggedAt?: string;
}

const STORAGE_KEY = "nutrimind_meal_entries_v1";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;

    return value.toString(16);
  });
}

function normalizeUserId(userId: number): number {
  if (Number.isFinite(userId) && userId > 0) {
    return userId;
  }

  return 1;
}

function normalizeDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDateOnly(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return normalizeDate(date);
}

async function readMeals(): Promise<MealEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as MealEntry[];
  } catch (error) {
    console.warn("[mealRepository] readMeals failed:", error);
    return [];
  }
}

async function writeMeals(meals: MealEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(meals));
}

export async function insertMeal(data: InsertMealData): Promise<string> {
  const now = new Date().toISOString();
  const id = generateUUID();
  const userId = normalizeUserId(data.userId);

  const meal: MealEntry = {
    id,
    user_id: userId,
    name: data.name.trim() || "Meal",
    calories: Number.isFinite(data.calories) ? data.calories : 0,
    protein_g: Number.isFinite(data.proteinG ?? 0) ? data.proteinG ?? 0 : 0,
    carbs_g: Number.isFinite(data.carbsG ?? 0) ? data.carbsG ?? 0 : 0,
    fat_g: Number.isFinite(data.fatG ?? 0) ? data.fatG ?? 0 : 0,
    meal_type: data.mealType ?? "other",
    logged_at: data.loggedAt ?? now,
    created_at: now,
    is_deleted: 0,
    server_id: null,
  };

  const meals = await readMeals();
  meals.unshift(meal);

  await writeMeals(meals);

  await enqueue("create", "meal", id, {
    local_id: id,
    name: meal.name,
    calories: meal.calories,
    proteinG: meal.protein_g,
    carbsG: meal.carbs_g,
    fatG: meal.fat_g,
    mealType: meal.meal_type,
    loggedAt: meal.logged_at,
  });

  return id;
}

export async function getMealHistory(
  userIdInput: number,
  limit = 50,
  offset = 0
): Promise<MealEntry[]> {
  const userId = normalizeUserId(userIdInput);
  const meals = await readMeals();

  return meals
    .filter((meal) => meal.user_id === userId && meal.is_deleted === 0)
    .sort(
      (a, b) =>
        new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
    )
    .slice(offset, offset + limit);
}

export async function getMealsByDate(
  userIdInput: number,
  date: string
): Promise<MealEntry[]> {
  const userId = normalizeUserId(userIdInput);
  const meals = await readMeals();

  return meals
    .filter(
      (meal) =>
        meal.user_id === userId &&
        meal.is_deleted === 0 &&
        getDateOnly(meal.logged_at) === date
    )
    .sort(
      (a, b) =>
        new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
    );
}

export async function deleteMeal(
  id: string,
  userIdInput: number
): Promise<void> {
  const userId = normalizeUserId(userIdInput);
  const meals = await readMeals();

  const updatedMeals = meals.map((meal) => {
    if (meal.id === id && meal.user_id === userId) {
      return {
        ...meal,
        is_deleted: 1,
      };
    }

    return meal;
  });

  await writeMeals(updatedMeals);

  await enqueue("delete", "meal", id, { local_id: id });
}

export async function getDailyCalories(
  userIdInput: number,
  date: string
): Promise<number> {
  const meals = await getMealsByDate(userIdInput, date);

  return meals.reduce((total, meal) => total + meal.calories, 0);
}

export async function getDailyMacros(
  userIdInput: number,
  date: string
): Promise<{
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}> {
  const meals = await getMealsByDate(userIdInput, date);

  return meals.reduce(
    (total, meal) => ({
      calories: total.calories + meal.calories,
      protein: total.protein + meal.protein_g,
      carbs: total.carbs + meal.carbs_g,
      fat: total.fat + meal.fat_g,
    }),
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    }
  );
}

export async function getDailyCalorieHistory(
  userIdInput: number,
  days = 7
): Promise<{ date: string; calories: number }[]> {
  const userId = normalizeUserId(userIdInput);
  const meals = await readMeals();

  const today = new Date();
  const result: { date: string; calories: number }[] = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);

    const dateKey = normalizeDate(date);

    const calories = meals
      .filter(
        (meal) =>
          meal.user_id === userId &&
          meal.is_deleted === 0 &&
          getDateOnly(meal.logged_at) === dateKey
      )
      .reduce((total, meal) => total + meal.calories, 0);

    result.push({
      date: dateKey,
      calories,
    });
  }

  return result;
}

export async function getMealServerId(localId: string): Promise<string | null> {
  const meals = await readMeals();
  const found = meals.find((m) => m.id === localId);
  return found?.server_id ?? null;
}

export async function updateMealServerId(
  localId: string,
  serverId: string
): Promise<void> {
  const meals = await readMeals();
  const updated = meals.map((m) =>
    m.id === localId ? { ...m, server_id: serverId } : m
  );
  await writeMeals(updated);
}