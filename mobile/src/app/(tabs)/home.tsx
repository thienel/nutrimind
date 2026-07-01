import React, { useCallback, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
} from "react-native";
import {
  Bell,
  Droplets,
  BrainCircuit,
  ChartColumn,
  Plus,
  Sparkles,
  ArrowRight,
  Scale,
  X,
  Trophy,
  CheckCircle,
  Circle,
} from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import { getMyProfile } from "@/services/profileService";
import { getLocalDateKey } from "@/lib/dateUtils";
import {
  getHealthSummary,
  getDailyMeals,
  getDailyWater,
  getAiAdvice,
} from "@/services/home.service";
import { getTodayMissions } from "@/services/mission.service";
import { getStreak } from "@/services/streak.service";
import { getFriendsActivity } from "@/services/social.service";
import { getMyChallenges } from "@/services/challenge.service";
import { getUnreadNotifications } from "@/services/notification.service";

export interface ProfileResponse {
  user_id: number;
  display_name: string;
  avatar_url: string;
  email: string;
  age: number;
  gender: "MALE" | "FEMALE";
  height_cm: number;
  weight_kg: number;
  goal: "LOSE_WEIGHT" | "GAIN_MUSCLE" | "MAINTAIN" | "EAT_HEALTHIER";
  activity_level:
    | "SEDENTARY"
    | "LIGHTLY_ACTIVE"
    | "MODERATELY_ACTIVE"
    | "VERY_ACTIVE";
  bmi: number;
  bmi_category: string;
  bmr: number;
  tdee: number;
  calorie_target: number;
  protein_target_g: number;
  carb_target_g: number;
  fat_target_g: number;
  water_target_ml: number;
  social_enabled: boolean;
  onboarding_done: boolean;
}

export interface LatestWeightSummary {
  weight_kg: number;
  logged_at: string;
  days_ago?: number;
}

export interface WeightPointDTO {
  logged_at: string;
  weight_kg: number;
}

export interface HealthSummaryResponse {
  bmi: number;
  bmi_category: string;
  bmr: number;
  tdee: number;
  calorie_target: number;
  protein_target_g: number;
  carb_target_g: number;
  fat_target_g: number;
  water_target_ml: number;
  latest_weight: LatestWeightSummary | null;
  weight_history: WeightPointDTO[];
}

export interface MealEntryResponse {
  id: number;
  food_name: string;
  meal_type: string;
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  source: string;
  logged_date: string;
  created_at: string;
}

export interface MealsByTypeResponse {
  breakfast: MealEntryResponse[];
  lunch: MealEntryResponse[];
  dinner: MealEntryResponse[];
  snack: MealEntryResponse[];
}

export interface MealDailyTotalsResponse {
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
}

export interface DailyMealsResponse {
  date: string;
  meals: MealsByTypeResponse;
  daily_totals: MealDailyTotalsResponse;
}

export interface WaterEntryResponse {
  id: number;
  volume_ml: number;
  created_at: string;
}

export interface WaterDayResponse {
  date: string;
  entries: WaterEntryResponse[];
  daily_total_ml: number;
  water_target_ml: number;
  total_ml?: number;
}

export interface AdviceContextSummaryResponse {
  calories_logged: number;
  calorie_target: number;
  water_ml_logged: number;
  water_target_ml: number;
}

export interface AdviceResponse {
  advice: string;
  disclaimer: string;
  context_summary: AdviceContextSummaryResponse;
  message?: string;
}

export interface EnrollmentSummaryResponse {
  enrollment_id: number;
  start_date: string;
  end_date: string;
  status: string;
  day_current: number;
  day_total: number;
}

export interface CatalogueChallengeItemResponse {
  id: number;
  name: string;
  type: string;
  duration_days: number;
  description: string;
  friends_enrolled: number;
  my_enrollment: EnrollmentSummaryResponse | null;
}

export interface GetChallengeCatalogueResponse {
  catalogue: CatalogueChallengeItemResponse[];
}

export interface HomeDashboardData {
  calories: {
    logged: number;
    target: number;
  };
  protein: {
    logged: number;
    target: number;
  };
  carbs: {
    logged: number;
    target: number;
  };
  fat: {
    logged: number;
    target: number;
  };
  water: {
    logged: number;
    target: number;
  };
  weight: {
    latest_kg: number;
    days_ago: number;
  } | null;
  insight: string | null;
  challenge: CatalogueChallengeItemResponse | null;
}

export interface MissionItem {
  text: string;
  done: boolean;
}

export interface StreakData {
  current: number;
  weeklyProgress: boolean[];
}

export interface FriendsActivityData {
  activeCount: number;
  latestActivity: string;
}

export interface NotificationSummary {
  unreadCount: number;
}

function getTodayKey() {
  return getLocalDateKey();
}

function formatMacroValue(value: number, goal: number) {
  return `${Math.round(value)} / ${goal}g`;
}

export default function HomeScreen() {
  // Láº¥y thÃ´ng tin user hiá»‡n táº¡i vÃ  tráº¡ng thÃ¡i auth Ä‘Ã£ load xong chÆ°a
  const { user, isHydrated } = useAuth();

  // State má»Ÿ/Ä‘Ã³ng modal update cÃ¢n náº·ng
  const [showWeightModal, setShowWeightModal] = useState(false);

  // State lÆ°u input cÃ¢n náº·ng user nháº­p
  const [weightInput, setWeightInput] = useState("");

  // State chá»©a toÃ n bá»™ dá»¯ liá»‡u dashboard home
  // Bao gá»“m calories, macro, nÆ°á»›c, challenge, insight...
  const [dashboardData, setDashboardData] = useState<HomeDashboardData | null>(
    null,
  );

  // State chá»©a danh sÃ¡ch nhiá»‡m vá»¥ trong ngÃ y
  const [missions, setMissions] = useState<MissionItem[]>([]);

  // State streak hiá»‡n táº¡i (sá»‘ ngÃ y liÃªn tá»¥c)
  const [streak, setStreak] = useState<StreakData | null>(null);

  // State hoáº¡t Ä‘á»™ng báº¡n bÃ¨
  const [friendsActivity, setFriendsActivity] =
    useState<FriendsActivityData | null>(null);

  // State sá»‘ thÃ´ng bÃ¡o chÆ°a Ä‘á»c
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  // Táº¡o tÃªn hiá»ƒn thá»‹:
  // Æ°u tiÃªn display_name
  // náº¿u chÆ°a cÃ³ thÃ¬ láº¥y pháº§n trÆ°á»›c @ trong email
  // náº¿u váº«n khÃ´ng cÃ³ thÃ¬ fallback "there"
  const displayName = useMemo(() => {
    const rawName = user?.display_name || user?.email?.split("@")[0] || "there";

    return rawName.trim() || "there";
  }, [user?.display_name, user?.email]);

  // TÃ­nh % calories Ä‘Ã£ Äƒn so vá»›i target
  // dÃ¹ng cho vÃ²ng trÃ²n progress
  const calorieProgress = dashboardData
    ? Math.min(dashboardData.calories.logged / dashboardData.calories.target, 1)
    : 0;

  // Kiá»ƒm tra hÃ´m nay cÃ³ Ä‘ang "Ä‘Ãºng plan" khÃ´ng
  // true náº¿u calories > 0 vÃ  chÆ°a vÆ°á»£t target
  const onTrack = dashboardData
    ? dashboardData.calories.logged > 0 &&
      dashboardData.calories.logged <= dashboardData.calories.target
    : true;

  // Ref chá»‘ng viá»‡c gá»i API nhiá»u láº§n cÃ¹ng lÃºc
  // náº¿u Ä‘ang fetch rá»“i thÃ¬ khÃ´ng fetch tiáº¿p
  const isFetchingRef = useRef(false);

  // Ref kiá»ƒm tra component cÃ²n mounted khÃ´ng
  // trÃ¡nh setState khi component Ä‘Ã£ unmount
  const mountedRef = useRef(true);

  // useFocusEffect cháº¡y má»—i khi screen Home Ä‘Æ°á»£c focus
  // vÃ­ dá»¥:
  // - vá»«a login xong
  // - tá»« mÃ n log meal quay vá»
  // - tá»« mÃ n water quay vá»
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      // ÄÃ¡nh dáº¥u component Ä‘ang active
      mountedRef.current = true;

      async function loadDashboard() {
        // Náº¿u Ä‘ang fetch thÃ¬ dá»«ng
        // trÃ¡nh duplicate request
        if (isFetchingRef.current) return;

        // ÄÃ¡nh dáº¥u báº¯t Ä‘áº§u fetch
        isFetchingRef.current = true;

        // Cháº·n fetch náº¿u auth chÆ°a sáºµn sÃ ng
        // vÃ­ dá»¥ token chÆ°a restore xong
        if (!isHydrated || !user?.id) {
          console.warn("[HomeScreen] loadDashboard skipped â€” auth not ready");

          // Reset láº¡i lock Ä‘á»ƒ láº§n sau cÃ²n fetch Ä‘Æ°á»£c
          isFetchingRef.current = false;
          return;
        }

        // Náº¿u component Ä‘Ã£ unmount thÃ¬ khÃ´ng cháº¡y tiáº¿p
        if (!mountedRef.current) return;

        try {
          // ===== BÆ¯á»šC 1: Láº¥y profile =====
          let profile: ProfileResponse | null = null;
          let profileError: any = null;

          // Retry tá»‘i Ä‘a 2 láº§n náº¿u bá»‹ lá»—i 404 táº¡m thá»i
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              profile = await getMyProfile({
                file: "home.tsx",
                route: "HomeScreen",
              });

              // ThÃ nh cÃ´ng thÃ¬ reset lá»—i
              profileError = null;
              break;
            } catch (err: any) {
              profileError = err;

              // Náº¿u láº§n Ä‘áº§u bá»‹ 404 thÃ¬ chá» 500ms rá»“i thá»­ láº¡i
              if (err?.status === 404 && attempt === 0) {
                await new Promise((resolve) => setTimeout(resolve, 500));
                continue;
              }

              break;
            }
          }

          // Náº¿u váº«n lá»—i sau retry
          if (profileError) {
            console.warn("[HomeScreen] Profile fetch failed:", profileError);

            // Táº¡o profile giáº£ Ä‘á»ƒ app khÃ´ng crash
            // chá»‰ dÃ¹ng fallback render UI
            profile = {
              user_id: 0,
              display_name: "",
              avatar_url: "",
              email: "",
              age: 0,
              gender: "MALE",
              height_cm: 0,
              weight_kg: 0,
              goal: "MAINTAIN",
              activity_level: "SEDENTARY",
              bmi: 0,
              bmi_category: "",
              bmr: 0,
              tdee: 0,
              calorie_target: 2000,
              protein_target_g: 120,
              carb_target_g: 250,
              fat_target_g: 65,
              water_target_ml: 2000,
              social_enabled: false,
              onboarding_done: false,
            };
          }

          // Sau bÆ°á»›c nÃ y profile cháº¯c cháº¯n luÃ´n tá»“n táº¡i
          // vÃ¬ hoáº·c fetch thÃ nh cÃ´ng, hoáº·c fallback data máº·c Ä‘á»‹nh
          const safeProfile = profile!;

          // Kiá»ƒm tra component cÃ²n active khÃ´ng
          // náº¿u user Ä‘Ã£ rá»i mÃ n thÃ¬ khÃ´ng cháº¡y tiáº¿p
          if (!isActive) return;

          // Fetch dá»¯ liá»‡u dashboard theo thá»© tá»± tuáº§n tá»± (sequential)
          // LÃ½ do:
          // - TrÃ¡nh race condition giá»¯a cÃ¡c API phá»¥ thuá»™c onboarding/profile
          // - Náº¿u profile chÆ°a sáºµn sÃ ng thÃ¬ cÃ¡c API sau cÃ³ thá»ƒ fail (403/404)

          const today = getTodayKey(); // Láº¥y ngÃ y hiá»‡n táº¡i theo local timezone (yyyy-mm-dd)

          // ===== STEP 2: HEALTH SUMMARY =====
          // Láº¥y dá»¯ liá»‡u sá»©c khá»e tá»•ng quan:
          // BMI, BMR, TDEE, macro target, water target, latest weight...
          const health = await getHealthSummary();

          // Náº¿u user Ä‘Ã£ rá»i mÃ n hÃ¬nh trong lÃºc chá» API tráº£ vá» thÃ¬ dá»«ng luÃ´n
          if (!isActive) return;

          // ===== STEP 3: DAILY MEALS =====
          // Láº¥y toÃ n bá»™ meal log cá»§a hÃ´m nay
          // DÃ¹ng Ä‘á»ƒ tÃ­nh calories + macro Ä‘Ã£ Äƒn
          console.log("[HomeScreen] today =", today);
          const numericUserId = user?.id ? Number(user.id) : undefined;
          const meals = await getDailyMeals(today, numericUserId);

          // Debug dá»¯ liá»‡u meals Ä‘á»ƒ kiá»ƒm tra backend tráº£ Ä‘Ãºng chÆ°a
          console.log(
            "[HomeScreen] mealsData =",
            JSON.stringify(meals, null, 2),
          );

          // Náº¿u unmount thÃ¬ dá»«ng
          if (!isActive) return;

          // ===== STEP 4: WATER TRACKING =====
          // Láº¥y dá»¯ liá»‡u lÆ°á»£ng nÆ°á»›c uá»‘ng trong ngÃ y
          // Náº¿u backend chÆ°a cÃ³ target thÃ¬ fallback theo profile
          const water = await getDailyWater(
            today,
            safeProfile.water_target_ml ?? 2000,
            numericUserId,
          );

          if (!isActive) return;

          // ===== STEP 5: AI ADVICE =====
          // Gá»i AI Ä‘á»ƒ láº¥y gá»£i Ã½ dinh dÆ°á»¡ng
          // Náº¿u backend tráº£ 403 (chÆ°a onboarding) thÃ¬ chá»‰ warning, khÃ´ng redirect
          const ai = await getAiAdvice();

          if (!isActive) return;

          // ===== STEP 6: CHALLENGES =====
          // Láº¥y danh sÃ¡ch challenge user Ä‘Ã£ tham gia
          const myChallenges = await getMyChallenges();

          // Láº¥y challenge Ä‘áº§u tiÃªn Ä‘á»ƒ hiá»ƒn thá»‹ trÃªn Home
          const challenge = myChallenges.length > 0 ? myChallenges[0] : null;

          if (!isActive) return;

          // ===== STEP 7: DAILY MISSIONS =====
          // Láº¥y nhiá»‡m vá»¥ háº±ng ngÃ y
          // Náº¿u API chÆ°a tá»“n táº¡i thÃ¬ service fallback data cá»©ng
          //
          // Truyá»n meals/water/health tá»« cÃ¡c STEP trÃªn vÃ o
          //    Ä‘á»ƒ mission service KHÃ”NG fetch láº¡i API.
          //    TrÆ°á»›c Ä‘Ã¢y getTodayMissions() tá»± fetch láº¡i,
          //    gÃ¢y duplicate /meals request â†' log 500 warning.
          // =======================================================
          const missionsData = await getTodayMissions(meals, water, health);

          // Cáº­p nháº­t state mission
          setMissions(missionsData);

          if (!isActive) return;

          // ===== STEP 8: STREAK =====
          // Láº¥y chuá»—i ngÃ y giá»¯ thÃ³i quen
          const streakData = await getStreak();

          // Cáº­p nháº­t streak UI
          setStreak(streakData);

          if (!isActive) return;

          // ===== STEP 9: FRIENDS ACTIVITY =====
          // Láº¥y hoáº¡t Ä‘á»™ng báº¡n bÃ¨ Ä‘á»ƒ hiá»ƒn thá»‹ motivation
          const friendsData = await getFriendsActivity();

          // Cáº­p nháº­t state
          setFriendsActivity(friendsData);

          if (!isActive) return;

          // ===== STEP 10: NOTIFICATION =====
          // Láº¥y sá»‘ notification chÆ°a Ä‘á»c
          const unreadCount = await getUnreadNotifications();

          // Update badge chuÃ´ng
          setUnreadNotifications(unreadCount);

          if (!isActive) return;

          // ===== TARGET SETUP =====
          // Æ¯u tiÃªn dá»¯ liá»‡u tá»« health API,
          // náº¿u thiáº¿u thÃ¬ fallback profile,
          // náº¿u váº«n thiáº¿u thÃ¬ fallback máº·c Ä‘á»‹nh
          const calorie_target =
            health?.calorie_target ?? safeProfile.calorie_target ?? 2000;

          const protein_target =
            health?.protein_target_g ?? safeProfile.protein_target_g ?? 120;

          const carb_target =
            health?.carb_target_g ?? safeProfile.carb_target_g ?? 250;

          const fat_target =
            health?.fat_target_g ?? safeProfile.fat_target_g ?? 65;

          const water_target =
            safeProfile.water_target_ml ?? health?.water_target_ml ?? 2000;

          // ===== WEIGHT DATA PARSING =====
          // Xá»­ lÃ½ latest weight Ä‘á»ƒ hiá»ƒn thá»‹ "updated x days ago"
          let weightData = null;
          const latestWeightObj = health?.latest_weight;

          if (latestWeightObj) {
            let daysAgo = 0;

            // Náº¿u backend tráº£ sáºµn days_ago thÃ¬ dÃ¹ng luÃ´n
            if (latestWeightObj.days_ago !== undefined) {
              daysAgo = latestWeightObj.days_ago;
            }

            // Náº¿u khÃ´ng cÃ³ thÃ¬ tá»± tÃ­nh tá»« logged_at
            else if (latestWeightObj.logged_at) {
              const todayObj = new Date(new Date().toLocaleDateString("en-CA"));
              const weightDateObj = new Date(latestWeightObj.logged_at);

              const diffTime = todayObj.getTime() - weightDateObj.getTime();

              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

              daysAgo = diffDays < 0 ? 0 : diffDays;
            }

            // Chuáº©n hÃ³a dá»¯ liá»‡u weight
            weightData = {
              latest_kg: latestWeightObj.weight_kg,
              days_ago: daysAgo,
            };
          }

          // ===== MAP DASHBOARD STATE =====
          // Gom toÃ n bá»™ data Ä‘á»ƒ render UI Home
          const mappedData: HomeDashboardData = {
            calories: {
              logged: meals.daily_totals.calories ?? 0,
              target: calorie_target,
            },

            protein: {
              logged: meals.daily_totals.protein_g ?? 0,
              target: protein_target,
            },

            carbs: {
              logged: meals.daily_totals.carb_g ?? 0,
              target: carb_target,
            },

            fat: {
              logged: meals.daily_totals.fat_g ?? 0,
              target: fat_target,
            },

            water: {
              logged:
                (water.total_ml !== undefined
                  ? water.total_ml
                  : water.daily_total_ml) ?? 0,
              target: water_target,
            },

            weight: weightData,

            // Náº¿u AI cÃ³ message thÃ¬ Æ°u tiÃªn message, khÃ´ng thÃ¬ advice
            insight: ai ? ai.message || ai.advice : null,

            challenge,
          };

          // Cáº­p nháº­t toÃ n bá»™ dashboard UI
          setDashboardData(mappedData);
        } catch (error) {
          console.warn("[HomeScreen] Failed to load dashboard data:", error);
        } finally {
          isFetchingRef.current = false;
        }
      }

      loadDashboard();

      return () => {
        isActive = false;
        mountedRef.current = false;
        isFetchingRef.current = false;
      };
    }, [isHydrated, user?.id]),
  );

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: 140 }]}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.hello}>Hello,</Text>
            <Text style={styles.name}>{displayName} 👋</Text>
            <Text style={styles.sub}>Let's make today amazing</Text>
          </View>

          <TouchableOpacity style={styles.bellBtn}>
            <Bell size={20} color="#475569" />
            {unreadNotifications > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* DAILY SUMMARY */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Summary</Text>

          <View style={styles.summaryRow}>
            {/* progress circle */}
            <View
              style={[
                styles.progressCircle,
                {
                  borderColor:
                    (dashboardData?.calories.logged || 0) >
                    (dashboardData?.calories.target || 2000)
                      ? "#EF4444"
                      : "#10B981",
                  opacity: (dashboardData?.calories.logged || 0) > 0 ? 1 : 0.55,
                },
              ]}
            >
              <Text style={styles.kcal}>
                {Math.round(dashboardData?.calories.logged || 0)}
              </Text>
              <Text style={styles.kcalSub}>
                / {dashboardData?.calories.target || 2000} kcal
              </Text>
              <Text style={styles.kcalPercent}>
                {Math.round(calorieProgress * 100)}%
              </Text>
            </View>

            <View style={styles.macroWrap}>
              <Macro
                label="Protein"
                value={formatMacroValue(
                  dashboardData?.protein.logged || 0,
                  dashboardData?.protein.target || 120,
                )}
                color="#8B5CF6"
              />
              <Macro
                label="Carbs"
                value={formatMacroValue(
                  dashboardData?.carbs.logged || 0,
                  dashboardData?.carbs.target || 250,
                )}
                color="#06B6D4"
              />
              <Macro
                label="Fat"
                value={formatMacroValue(
                  dashboardData?.fat.logged || 0,
                  dashboardData?.fat.target || 65,
                )}
                color="#F59E0B"
              />
            </View>
          </View>

          <View
            style={[
              styles.trackBox,
              !onTrack &&
                (dashboardData?.calories.logged || 0) > 0 &&
                styles.warningBox,
            ]}
          >
            <Text
              style={[
                styles.trackText,
                !onTrack &&
                  (dashboardData?.calories.logged || 0) > 0 &&
                  styles.warningText,
              ]}
            >
              {(dashboardData?.calories.logged || 0) <= 0
                ? "🍽️ Log your first meal to start tracking"
                : onTrack
                  ? "💚 You're on track! Keep it up"
                  : "🔥 You're over today's calorie goal"}
            </Text>
          </View>
        </View>

        {/* AI MISSION */}
        <View style={styles.card}>
          <View style={styles.missionHeader}>
            <View style={styles.sparkBox}>
              <Sparkles size={18} color="#10B981" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.missionTitle}>AI Daily Mission</Text>
              <Text style={styles.missionSub}>Your roadmap for today</Text>
            </View>

            <Text style={styles.progressText}>
              {missions.length > 0
                ? `${missions.filter((m) => m.done).length}/${missions.length}`
                : "0/0"}
            </Text>
          </View>

          {missions.map((mission, index) => (
            <Mission key={index} text={mission.text} done={mission.done} />
          ))}
        </View>

        {/* STREAK */}
        <View style={styles.streakCard}>
          <Text style={styles.streakLabel}>Daily Streak</Text>
          <Text style={styles.streakTitle}>🔥 {streak?.current ?? 0} Days</Text>
          <Text style={styles.streakSub}>
            {streak
              ? `You've stayed consistent for ${streak.current} days`
              : "Start logging to build your streak"}
          </Text>

          <View style={styles.streakBar}>
            {(
              streak?.weeklyProgress ?? []
            ).map((done, i) => (
              <View
                key={i}
                style={[styles.streakDot, done && { backgroundColor: "white" }]}
              />
            ))}
          </View>
        </View>

        {/* WEIGHT */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push("/weight-log")}
        >
          <View style={styles.card}>
            <View style={styles.weightTop}>
              <View>
                <Text style={styles.weightLabel}>Weekly Weight Check</Text>
                <Text style={styles.weight}>
                  {dashboardData?.weight
                    ? `${dashboardData.weight.latest_kg} kg`
                    : "-- kg"}
                </Text>
                <Text style={styles.weightSub}>
                  {dashboardData?.weight
                    ? dashboardData.weight.days_ago === 0
                      ? "Updated today"
                      : `Last updated ${dashboardData.weight.days_ago} days ago`
                    : "No weight logged yet"}
                </Text>
              </View>

              <View style={styles.weightIcon}>
                <Scale size={22} color="#155E75" />
              </View>
            </View>

            <TouchableOpacity
              style={styles.weightBtn}
              onPress={() => router.push("/weight-log")}
            >
              <Text style={styles.weightBtnText}>Update Weight</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.quickGrid}>
          <QuickAction
            icon={<Plus size={20} color="white" />}
            title="Log Meal"
            color="#10B981"
            onPress={() => router.push("/meal-log")}
          />

          <QuickAction
            icon={<Droplets size={20} color="white" />}
            title="Water"
            color="#06B6D4"
            onPress={() => router.push("/water-log")}
          />

          <QuickAction
            icon={<BrainCircuit size={20} color="white" />}
            title="AI Coach"
            color="#8B5CF6"
            onPress={() => router.push("/coach")}
          />

          <QuickAction
            icon={<ChartColumn size={20} color="white" />}
            title="Report"
            color="#EC4899"
            onPress={() => router.push("/progress")}
          />
        </View>

        {/* FRIEND MOTIVATION */}
        <Text style={styles.sectionTitle}>Stay Motivated 🔥</Text>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push("/friends")}
        >
          <View style={styles.friendCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.friendLabel}>Friends Motivation</Text>
              <Text style={styles.friendTitle}>
                {friendsActivity?.activeCount != null
                  ? `${friendsActivity.activeCount} friends active 💪`
                  : "No friends yet"}
              </Text>
              <Text style={styles.friendSub}>
                {friendsActivity?.latestActivity || "No friends yet"}
              </Text>
            </View>

            <View style={styles.friendIcon}>
              <Trophy size={22} color="#0F172A" />
            </View>
          </View>
        </TouchableOpacity>

        {/* ACTIVE CHALLENGE */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push("/challenges")}
        >
          <View style={styles.challengeCard}>
            <Text style={styles.challengeLabel}>Active Challenge</Text>
            <Text style={styles.challengeTitle}>
              {dashboardData?.challenge?.name || "No active challenge"}
            </Text>
            <Text style={styles.challengeSub}>
              {dashboardData?.challenge?.my_enrollment
                ? `${dashboardData.challenge.my_enrollment.day_current} / ${dashboardData.challenge.my_enrollment.day_total} days completed`
                : dashboardData?.challenge
                  ? `${dashboardData.challenge.duration_days} days challenge`
                  : "Join a challenge to get started"}
            </Text>

            <View style={styles.challengeProgress}>
              <View
                style={[
                  styles.challengeFill,
                  {
                    width: dashboardData?.challenge?.my_enrollment
                      ? `${Math.min(
                          (dashboardData.challenge.my_enrollment.day_current /
                            dashboardData.challenge.my_enrollment.day_total) *
                            100,
                          100,
                        )}%`
                      : "0%",
                  },
                ]}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* AI INSIGHT */}
        <View style={styles.insightCard}>
          <Text style={styles.insightBadge}>AI Insight</Text>

          <Text style={styles.insightTitle}>
            {dashboardData?.insight
              ? "AI Recommendation"
              : "No insights yet"}
          </Text>

          <Text style={styles.insightSub}>
            {dashboardData?.insight ||
              "Check back after logging more meals"}
          </Text>

          <TouchableOpacity
            style={styles.insightBtn}
            onPress={() => router.push("/coach")}
          >
            <Text style={styles.insightBtnText}>Ask AI Coach</Text>
            <ArrowRight size={18} color="white" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL UPDATE WEIGHT */}
      <Modal visible={showWeightModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Weight</Text>

              <TouchableOpacity onPress={() => setShowWeightModal(false)}>
                <X size={20} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              value={weightInput}
              onChangeText={setWeightInput}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => setShowWeightModal(false)}
            >
              <Text style={styles.saveText}>Save Weight</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Macro({ label, value, color }: any) {
  return (
    <View style={styles.macroItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>{value}</Text>
      </View>
    </View>
  );
}

function Mission({ text, done = false }: any) {
  return (
    <View style={styles.missionItem}>
      {done
        ? <CheckCircle size={20} color="#10B981" />
        : <Circle size={20} color="#CBD5E1" />}
      <Text style={styles.missionText}>{text}</Text>
    </View>
  );
}

function QuickAction({ icon, title, color, onPress }: any) {
  return (
    <TouchableOpacity style={styles.quickActionCard} onPress={onPress}>
      <View style={[styles.quickIcon, { backgroundColor: color }]}>{icon}</View>
      <Text style={styles.quickText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9F8",
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  hello: {
    color: "#94A3B8",
    fontSize: 14,
  },
  name: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
  },
  sub: {
    color: "#64748B",
    marginTop: 4,
  },

  bellBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },

  bellBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },

  bellBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
  },

  card: {
    backgroundColor: "white",
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,

    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  cardTitle: {
    fontWeight: "700",
    fontSize: 16,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },

  progressCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    borderColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },

  kcal: {
    fontSize: 34,
    fontWeight: "800",
  },

  kcalSub: {
    color: "#94A3B8",
    fontSize: 12,
  },

  kcalPercent: {
    marginTop: 4,
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
  },

  macroWrap: {
    justifyContent: "space-around",
  },

  macroItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 10,
  },

  macroLabel: {
    color: "#94A3B8",
    fontSize: 13,
  },

  macroValue: {
    fontWeight: "700",
    marginTop: 2,
  },

  trackBox: {
    marginTop: 20,
    backgroundColor: "#ECFDF5",
    padding: 14,
    borderRadius: 999,
  },

  warningBox: {
    backgroundColor: "#FEF2F2",
  },

  trackText: {
    textAlign: "center",
    color: "#10B981",
    fontWeight: "600",
  },

  warningText: {
    color: "#EF4444",
  },

  missionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  sparkBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  missionTitle: {
    fontWeight: "700",
    fontSize: 17,
  },

  missionSub: {
    color: "#64748B",
    fontSize: 13,
  },

  progressText: {
    color: "#10B981",
    fontWeight: "700",
  },

  missionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },

  missionText: {
    marginLeft: 12,
    color: "#334155",
  },

  streakCard: {
    backgroundColor: "#F97316",
    borderRadius: 32,
    padding: 22,
    marginBottom: 20,
  },

  streakLabel: {
    color: "rgba(255,255,255,0.8)",
  },

  streakTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "white",
    marginTop: 6,
  },

  streakSub: {
    color: "rgba(255,255,255,0.8)",
    marginTop: 8,
  },

  streakBar: {
    flexDirection: "row",
    marginTop: 16,
    gap: 6,
  },

  streakDot: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.3)",
  },

  weightTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  weightSub: {
    marginTop: 8,
    color: "#64748B",
    fontSize: 13,
  },

  weightIcon: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: "#ECFEFF",
    justifyContent: "center",
    alignItems: "center",
  },

  quickGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },

  quickActionCard: {
    width: 80,
    height: 98,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  quickIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  quickText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 10,
    fontWeight: "600",
  },

  friendCard: {
    backgroundColor: "white",
    borderRadius: 28,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,

    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },

  friendLabel: {
    fontSize: 13,
    color: "#94A3B8",
  },

  friendTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 6,
    color: "#0F172A",
  },

  friendSub: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 8,
    lineHeight: 20,
  },

  friendIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  challengeCard: {
    position: "relative",
    backgroundColor: "#1E3A8A",
    borderRadius: 28,
    padding: 20,
    marginBottom: 18,
    overflow: "hidden",
  },

  challengeLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },

  challengeTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 8,
  },

  challengeSub: {
    color: "rgba(255,255,255,0.7)",
    marginTop: 8,
  },

  challengeProgress: {
    marginTop: 18,
    height: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 999,
    overflow: "hidden",
  },

  challengeFill: {
    width: "72%",
    height: "100%",
    backgroundColor: "white",
    borderRadius: 999,
  },

  insightCard: {
    backgroundColor: "#0F172A",
    borderRadius: 30,
    padding: 22,
    marginBottom: 20,

    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4,
  },

  insightBadge: {
    color: "#34D399",
    fontWeight: "700",
  },

  insightTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
    marginTop: 16,
  },

  insightSub: {
    color: "#CBD5E1",
    marginTop: 12,
    lineHeight: 24,
  },

  insightBtn: {
    marginTop: 18,
    backgroundColor: "#10B981",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",

    shadowColor: "#10B981",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 3,
  },

  insightBtnText: {
    color: "white",
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.35)",
    justifyContent: "flex-end",
  },

  modal: {
    backgroundColor: "white",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
  },

  input: {
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    padding: 20,
    fontSize: 34,
    fontWeight: "700",
    textAlign: "center",
  },

  saveBtn: {
    marginTop: 20,
    backgroundColor: "#0F172A",
    borderRadius: 999,
    padding: 18,
    alignItems: "center",
  },

  saveText: {
    color: "white",
    fontWeight: "700",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 14,
    marginTop: 10,
  },

  weightLabel: {
    fontSize: 13,
    color: "#94A3B8",
  },

  weight: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 6,
  },

  weightBtn: {
    marginTop: 16,
    backgroundColor: "#0F172A",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },

  weightBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 14,
  },
});

