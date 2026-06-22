import { api } from "@/lib/apiClient";
import type {
  HealthSummaryResponse,
  DailyMealsResponse,
  WaterDayResponse,
  AdviceResponse,
  GetChallengeCatalogueResponse,
  CatalogueChallengeItemResponse,
} from "@/app/(tabs)/home";

export async function getHealthSummary(): Promise<HealthSummaryResponse | null> {
  try {
    return await api.get<HealthSummaryResponse>("/health/summary");
  } catch (err: any) {
    console.warn("[HomeService] Health summary fetch failed:", err);
    return null;
  }
}

export async function getDailyMeals(date: string): Promise<DailyMealsResponse> {
  const defaultMeals: DailyMealsResponse = {
    date,
    meals: {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    },
    daily_totals: {
      calories: 0,
      protein_g: 0,
      carb_g: 0,
      fat_g: 0,
    },
  };

  try {
    const mealsData = await api.get<DailyMealsResponse>(`/meals?date=${date}`);
    return mealsData;
  } catch (err: any) {
    console.warn("[HomeService] Meals fetch failed:", err);
    return defaultMeals;
  }
}

export async function getDailyWater(
  date: string,
  waterTargetMl: number = 2000,
): Promise<WaterDayResponse> {
  const defaultWater: WaterDayResponse = {
    date,
    entries: [],
    daily_total_ml: 0,
    water_target_ml: waterTargetMl,
    total_ml: 0,
  };

  try {
    const waterData = await api.get<WaterDayResponse>(`/water?date=${date}`);
    return waterData;
  } catch (err: any) {
    console.warn("[HomeService] Water fetch failed:", err);
    return defaultWater;
  }
}

export async function getAiAdvice(): Promise<AdviceResponse | null> {
  try {
    return await api.post<AdviceResponse>("/ai/advice", {});
  } catch (err: any) {
    if (err?.status === 403) {
      console.warn(
        "[HomeService] AI advice blocked (ONBOARDING_REQUIRED 403):",
        err,
      );
    } else {
      console.warn("[HomeService] AI advice fetch failed:", err);
    }
    return null;
  }
}

export async function getChallenges(): Promise<
  GetChallengeCatalogueResponse | CatalogueChallengeItemResponse[] | null
> {
  try {
    return await api.get<
      GetChallengeCatalogueResponse | CatalogueChallengeItemResponse[]
    >("/social/challenges");
  } catch (err: any) {
    if (err?.status === 403) {
      console.warn(
        "[HomeService] Challenges blocked (ONBOARDING_REQUIRED 403):",
        err,
      );
    } else {
      console.warn("[HomeService] Challenges fetch failed:", err);
    }
    return null;
  }
}

export function mapChallenges(
  challengesRaw:
    | GetChallengeCatalogueResponse
    | CatalogueChallengeItemResponse[]
    | null,
): CatalogueChallengeItemResponse[] {
  if (!challengesRaw) return [];

  if (Array.isArray(challengesRaw)) {
    return challengesRaw;
  }

  if (Array.isArray((challengesRaw as any).catalogue)) {
    return (challengesRaw as any).catalogue;
  }

  return [];
}
