import { getDailyMeals, getDailyWater, getHealthSummary } from "./home.service";
import { getLocalDateKey } from "@/lib/dateUtils";
import type {
  MissionItem,
  DailyMealsResponse,
  WaterDayResponse,
  HealthSummaryResponse,
} from "@/app/(tabs)/home";

// =======================================================
// Mission mặc định (fallback)
// Nếu API fail vẫn có dữ liệu để render UI
// =======================================================
const DEFAULT_MISSIONS: MissionItem[] = [
  { text: "Drink 8 glasses of water", done: true },
  { text: "Eat 40g protein", done: false },
  { text: "Complete 3 meals", done: false },
  { text: "Keep under 1800 kcal", done: true },
];

// Lấy daily missions cho HomeScreen
export async function getTodayMissions(
  meals?: DailyMealsResponse | null,
  water?: WaterDayResponse | null,
  health?: HealthSummaryResponse | null,
): Promise<MissionItem[]> {
  try {
    const today = getLocalDateKey();

    // =========================================================
    // Mỗi API fetch độc lập — chỉ fetch cái chưa có
    //
    // Cách hoạt động của ?? (nullish coalescing):
    //   meals ?? getDailyMeals(today)
    //   → nếu meals !== null && meals !== undefined → dùng meals
    //   → nếu meals === null || meals === undefined → gọi API
    //
    // Vì params có thể là null (API HomeScreen trả null), ta dùng ??
    // thay vì || để không fetch lại khi param = 0, '', false.
    // =========================================================
    const [mealsRes, waterRes, healthRes] = await Promise.allSettled([
      meals ?? getDailyMeals(today),
      water ?? getDailyWater(today),
      health ?? getHealthSummary(),
    ]);

    // Lấy dữ liệu từ các API (nếu thành công)
    const finalMeals = mealsRes.status === "fulfilled" ? mealsRes.value : null;
    const finalWater = waterRes.status === "fulfilled" ? waterRes.value : null;
    const finalHealth =
      healthRes.status === "fulfilled" ? healthRes.value : null;

    // =========================================================
    // DEBUG: Log nguồn mission data
    // =========================================================
    console.log(
      "[MissionService] source meals=",
      finalMeals ? "API" : "null",
      "water=",
      finalWater ? "API" : "null",
      "health=",
      finalHealth ? "API" : "null",
    );

    return buildMissionsFromData(finalMeals, finalWater, finalHealth);
  } catch (err: any) {
    // Nếu API lỗi thì fallback về default mission
    console.warn(
      "[MissionService] Failed to build missions, using defaults:",
      err,
    );

    return DEFAULT_MISSIONS;
  }
}

// =======================================================
// Build mission array từ dữ liệu meals/water/health
// Tách riêng để tái sử dụng giữa 2 luồng (fetch sẵn / tự fetch)
// =======================================================
function buildMissionsFromData(
  meals: DailyMealsResponse | null,
  water: WaterDayResponse | null,
  health: HealthSummaryResponse | null,
): MissionItem[] {
  // --- Water mission ---
  // done nếu tổng lượng nước đã uống >= mục tiêu nước
  const waterTarget = water?.water_target_ml ?? health?.water_target_ml ?? 2000;
  const waterDone = (water?.daily_total_ml ?? 0) >= waterTarget;

  // --- Protein mission ---
  // done nếu protein đã ăn >= 40% mục tiêu protein
  const proteinTarget = health?.protein_target_g ?? 100;
  const proteinDone =
    (meals?.daily_totals?.protein_g ?? 0) >= proteinTarget * 0.4;

  // --- Meal mission ---
  // done nếu tổng số bữa ăn trong ngày >= 3
  const totalMeals =
    (meals?.meals?.breakfast?.length ?? 0) +
    (meals?.meals?.lunch?.length ?? 0) +
    (meals?.meals?.dinner?.length ?? 0) +
    (meals?.meals?.snack?.length ?? 0);
  const mealDone = totalMeals >= 3;

  // --- Calories mission ---
  // done nếu calories đã ăn <= mục tiêu calories
  const calorieTarget = health?.calorie_target ?? 1800;
  const caloriesDone = (meals?.daily_totals?.calories ?? 0) <= calorieTarget;

  return [
    { text: "Drink 8 glasses of water", done: waterDone },
    { text: "Eat 40g protein", done: proteinDone },
    { text: "Complete 3 meals", done: mealDone },
    { text: "Keep under 1800 kcal", done: caloriesDone },
  ];
}
