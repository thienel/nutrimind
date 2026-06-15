import { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import {
  Droplets,
  Scale,
  TrendingDown,
  Flame,
  ChevronRight,
} from "lucide-react-native";

import { OfflineBanner } from "@/components/OfflineBanner";
import { useAuth } from "@/context/AuthContext";
import { useWaterLog } from "@/hooks/useWaterLog";
import { useWeightLog } from "@/hooks/useWeightLog";
import { getDailyMacros } from "@/lib/repositories/mealRepository";

const DAILY_CALORIE_GOAL = 2000;
const DAILY_WATER_GOAL_ML = 2000;

type DailyMacros = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

function getTodayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function safeUserId(value: unknown) {
  const parsed = Number(value);

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return 1;
}

export default function Home() {
  const { user } = useAuth();

  const today = getTodayKey();
  const userId = safeUserId(user?.id);

  const [macros, setMacros] = useState<DailyMacros>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  const { totalMl } = useWaterLog(user?.id ?? null, today);
  const { latestWeight } = useWeightLog(user?.id ?? null);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function loadTodayMacros() {
        try {
          const dailyMacros = await getDailyMacros(userId, today);

          if (mounted) {
            setMacros(dailyMacros);
          }
        } catch (error) {
          console.error("[Home] load daily macros failed:", error);

          if (mounted) {
            setMacros({
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
            });
          }
        }
      }

      loadTodayMacros();

      return () => {
        mounted = false;
      };
    }, [today, userId])
  );

  const caloriePct = Math.min(
    (macros.calories / DAILY_CALORIE_GOAL) * 100,
    100
  );
  const waterPct = Math.min((totalMl / DAILY_WATER_GOAL_ML) * 100, 100);
  const calorieDeficit = DAILY_CALORIE_GOAL - macros.calories;

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12
      ? "Chào buổi sáng"
      : greetingHour < 18
      ? "Chào buổi chiều"
      : "Chào buổi tối";

  const todayFormatted = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <OfflineBanner pushContent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>
              {user?.display_name?.split(" ")[0] ?? "bạn"} 👋
            </Text>
            <Text style={styles.date}>{todayFormatted}</Text>
          </View>
        </View>

        <Pressable
          style={styles.calorieCard}
          onPress={() => router.push("/meal-history")}
        >
          <View style={styles.calorieLeft}>
            <View style={styles.flameWrap}>
              <Flame size={28} color="#F59E0B" />
            </View>

            <View>
              <Text style={styles.calorieLabel}>Calories hôm nay</Text>
              <Text style={styles.calorieValue}>
                {Math.round(macros.calories)}
                <Text style={styles.calorieUnit}>
                  {" "}
                  / {DAILY_CALORIE_GOAL} kcal
                </Text>
              </Text>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${caloriePct}%`,
                      backgroundColor:
                        caloriePct > 90 ? "#EF4444" : "#F59E0B",
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          <ChevronRight size={18} color="#CBD5E1" />
        </Pressable>

        <View style={styles.macroRow}>
          <MacroCard
            label="Protein"
            value={Math.round(macros.protein)}
            unit="g"
            color="#10B981"
            bg="#ECFDF5"
          />

          <MacroCard
            label="Carbs"
            value={Math.round(macros.carbs)}
            unit="g"
            color="#6366F1"
            bg="#EEF2FF"
          />

          <MacroCard
            label="Fat"
            value={Math.round(macros.fat)}
            unit="g"
            color="#F59E0B"
            bg="#FFFBEB"
          />
        </View>

        <Pressable
          style={styles.card}
          onPress={() => router.push("/water-log")}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.cardIcon, { backgroundColor: "#EFF6FF" }]}>
              <Droplets size={22} color="#3B82F6" />
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.cardLabel}>Nước uống</Text>
              <Text style={[styles.cardValue, { color: "#3B82F6" }]}>
                {(totalMl / 1000).toFixed(2)}L
                <Text style={styles.cardUnit}> / 2L</Text>
              </Text>

              <View style={[styles.progressTrack, { marginTop: 6 }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${waterPct}%`,
                      backgroundColor: "#3B82F6",
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          <ChevronRight size={18} color="#CBD5E1" />
        </Pressable>

        <Pressable
          style={styles.card}
          onPress={() => router.push("/weight-log")}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.cardIcon, { backgroundColor: "#F5F3FF" }]}>
              <Scale size={22} color="#8B5CF6" />
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.cardLabel}>Cân nặng hiện tại</Text>
              <Text style={[styles.cardValue, { color: "#8B5CF6" }]}>
                {latestWeight != null
                  ? `${latestWeight.toFixed(1)} kg`
                  : "Chưa có dữ liệu"}
              </Text>
            </View>
          </View>

          <ChevronRight size={18} color="#CBD5E1" />
        </Pressable>

        <View style={styles.deficitCard}>
          <TrendingDown
            size={18}
            color={calorieDeficit >= 0 ? "#10B981" : "#EF4444"}
          />

          <Text style={styles.deficitLabel}>Calorie deficit hôm nay</Text>

          <Text
            style={[
              styles.deficitValue,
              {
                color: calorieDeficit >= 0 ? "#10B981" : "#EF4444",
              },
            ]}
          >
            {calorieDeficit >= 0 ? "+" : ""}
            {Math.round(calorieDeficit)} kcal
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MacroCard({
  label,
  value,
  unit,
  color,
  bg,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.macroCard, { backgroundColor: bg }]}>
      <Text style={[styles.macroValue, { color }]}>{value}</Text>
      <Text style={[styles.macroUnit2, { color }]}>{unit}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9F8",
  },

  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  header: {
    paddingTop: 12,
    paddingBottom: 20,
  },

  greeting: {
    fontSize: 16,
    color: "#64748B",
  },

  name: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },

  date: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
  },

  calorieCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  calorieLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },

  flameWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFBEB",
    justifyContent: "center",
    alignItems: "center",
  },

  calorieLabel: {
    fontSize: 13,
    color: "#94A3B8",
  },

  calorieValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },

  calorieUnit: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "400",
  },

  progressTrack: {
    width: 160,
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 8,
  },

  progressFill: {
    height: "100%",
    borderRadius: 3,
  },

  macroRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },

  macroCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },

  macroValue: {
    fontSize: 22,
    fontWeight: "800",
  },

  macroUnit2: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },

  macroLabel: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },

  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  cardBody: {
    flex: 1,
  },

  cardLabel: {
    fontSize: 13,
    color: "#94A3B8",
  },

  cardValue: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },

  cardUnit: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "400",
  },

  deficitCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },

  deficitLabel: {
    flex: 1,
    fontSize: 14,
    color: "#64748B",
  },

  deficitValue: {
    fontSize: 16,
    fontWeight: "800",
  },
});