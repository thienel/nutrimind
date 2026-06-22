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
  getChallenges,
  mapChallenges,
} from "@/services/home.service";
import { getTodayMissions } from "@/services/mission.service";
import { getStreak } from "@/services/streak.service";
import { getFriendsActivity } from "@/services/social.service";
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
  const { user, isHydrated } = useAuth();

  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [dashboardData, setDashboardData] = useState<HomeDashboardData | null>(
    null,
  );
  const [missions, setMissions] = useState<MissionItem[]>([]);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [friendsActivity, setFriendsActivity] =
    useState<FriendsActivityData | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  const displayName = useMemo(() => {
    const rawName = user?.display_name || user?.email?.split("@")[0] || "there";

    return rawName.trim() || "there";
  }, [user?.display_name, user?.email]);

  const calorieProgress = dashboardData
    ? Math.min(dashboardData.calories.logged / dashboardData.calories.target, 1)
    : 0;

  const onTrack = dashboardData
    ? dashboardData.calories.logged > 0 &&
      dashboardData.calories.logged <= dashboardData.calories.target
    : true;

  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      mountedRef.current = true;

      async function loadDashboard() {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        // Auth readiness gate — block fetches until auth is fully hydrated
        if (!isHydrated || !user?.id) {
          console.warn("[HomeScreen] loadDashboard skipped — auth not ready");
          isFetchingRef.current = false;
          return;
        }

        // Mounted guard
        if (!mountedRef.current) return;

        try {
          // Step 1: GET /profile
          // Home screen NEVER redirects on 404.
          // AuthContext is the ONLY component allowed to route based on onboarding.
          // On 404: show loading state, retry once after 500ms, then render with empty data.
          let profile: ProfileResponse | null = null;
          let profileError: any = null;

          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              profile = await getMyProfile({
                file: "home.tsx",
                route: "HomeScreen",
              });
              profileError = null;
              break;
            } catch (err: any) {
              profileError = err;
              if (err?.status === 404 && attempt === 0) {
                // Retry once after 500ms for transient 404
                await new Promise((resolve) => setTimeout(resolve, 500));
                continue;
              }
              break;
            }
          }

          if (profileError) {
            console.warn("[HomeScreen] Profile fetch failed:", profileError);
            // Do NOT redirect. Render with empty profile data.
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

          // At this point profile is guaranteed non-null
          const safeProfile = profile!;

          if (!isActive) return;

          if (!isActive) return;

          // Sequential fetch order (Rule C):
          // Step 1: profile (already done above)
          // Step 2: health summary
          // Step 3: meals
          // Step 4: water
          // Step 5: ai advice
          // Step 6: challenges
          const today = getTodayKey();

          // Step 2: health summary
          const health = await getHealthSummary();

          if (!isActive) return;

          // Step 3: meals
          const meals = await getDailyMeals(today);
          console.log(
            "[HomeScreen] mealsData =",
            JSON.stringify(meals, null, 2),
          );

          if (!isActive) return;

          // Step 4: water
          const water = await getDailyWater(
            today,
            safeProfile.water_target_ml ?? 2000,
          );

          if (!isActive) return;

          // Step 5: ai advice
          // Rule D: 403 ONBOARDING_REQUIRED -> log warning only, do NOT redirect
          const ai = await getAiAdvice();

          if (!isActive) return;

          // Step 6: challenges
          // Rule D: 403 ONBOARDING_REQUIRED -> log warning only, do NOT redirect
          const challengesRaw = await getChallenges();
          const challengesList = mapChallenges(challengesRaw);
          const challenge =
            challengesList.length > 0 ? challengesList[0] : null;

          if (!isActive) return;

          // Step 7: missions
          const missionsData = await getTodayMissions();
          setMissions(missionsData);

          if (!isActive) return;

          // Step 8: streak
          const streakData = await getStreak();
          setStreak(streakData);

          if (!isActive) return;

          // Step 9: friends activity
          const friendsData = await getFriendsActivity();
          setFriendsActivity(friendsData);

          if (!isActive) return;

          // Step 10: notifications unread count
          const unreadCount = await getUnreadNotifications();
          setUnreadNotifications(unreadCount);

          if (!isActive) return;

          // Target values setup
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

          // Latest weight parsing
          let weightData = null;
          const latestWeightObj = health?.latest_weight;
          if (latestWeightObj) {
            let daysAgo = 0;
            if (latestWeightObj.days_ago !== undefined) {
              daysAgo = latestWeightObj.days_ago;
            } else if (latestWeightObj.logged_at) {
              const todayObj = new Date(new Date().toLocaleDateString("en-CA"));
              const weightDateObj = new Date(latestWeightObj.logged_at);
              const diffTime = todayObj.getTime() - weightDateObj.getTime();
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              daysAgo = diffDays < 0 ? 0 : diffDays;
            }
            weightData = {
              latest_kg: latestWeightObj.weight_kg,
              days_ago: daysAgo,
            };
          }

          // State mapping
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
            insight: ai ? ai.message || ai.advice : null,
            challenge,
          };

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
            <Text style={styles.sub}>Let’s make today amazing</Text>
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
                  ? "💚 You’re on track! Keep it up"
                  : "🔥 You’re over today’s calorie goal"}
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
                : "2/4"}
            </Text>
          </View>

          {missions.length > 0
            ? missions.map((mission, index) => (
                <Mission key={index} text={mission.text} done={mission.done} />
              ))
            : [
                <Mission
                  key="fallback-1"
                  text="Drink 8 glasses of water"
                  done
                />,
                <Mission key="fallback-2" text="Eat 40g protein" />,
                <Mission key="fallback-3" text="Complete 3 meals" />,
                <Mission key="fallback-4" text="Keep under 1800 kcal" done />,
              ]}
        </View>

        {/* STREAK */}
        <View style={styles.streakCard}>
          <Text style={styles.streakLabel}>Daily Streak</Text>
          <Text style={styles.streakTitle}>🔥 {streak?.current ?? 6} Days</Text>
          <Text style={styles.streakSub}>
            {streak
              ? `You’ve stayed consistent for ${streak.current} days`
              : "You’ve stayed consistent for 6 days"}
          </Text>

          <View style={styles.streakBar}>
            {(
              streak?.weeklyProgress ?? [
                true,
                true,
                true,
                true,
                true,
                true,
                false,
              ]
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
                {friendsActivity
                  ? `${friendsActivity.activeCount} friends active 💪`
                  : "4 friends active 💪"}
              </Text>
              <Text style={styles.friendSub}>
                {friendsActivity?.latestActivity ||
                  "Linh completed hydration • Minh hit protein target"}
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
              {dashboardData?.challenge?.name || "Hydration Hero 💧"}
            </Text>
            <Text style={styles.challengeSub}>
              {dashboardData?.challenge?.my_enrollment
                ? `${dashboardData.challenge.my_enrollment.day_current} / ${dashboardData.challenge.my_enrollment.day_total} days completed`
                : dashboardData?.challenge
                  ? `${dashboardData.challenge.duration_days} days challenge`
                  : "5 / 7 days completed"}
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
                      : "72%",
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
              : "You are low on protein today"}
          </Text>

          <Text style={styles.insightSub}>
            {dashboardData?.insight ||
              "Try chicken breast, yogurt, or eggs for dinner."}
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
      <Text style={{ color: done ? "#10B981" : "#CBD5E1" }}>
        {done ? "✓" : "○"}
      </Text>
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
