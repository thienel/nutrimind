import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  TrendingDown,
  Utensils,
  Droplets,
  Scale,
  ChevronRight,
} from "lucide-react-native";

import { OfflineBanner } from "@/components/OfflineBanner";
import { useAuth } from "@/context/AuthContext";
import { useCalorieHistory } from "@/hooks/useMealLog";
import { useWaterHistory } from "@/hooks/useWaterLog";
import { useWeightChart, useWeightLog } from "@/hooks/useWeightLog";
import { dateKeyToLocalDate } from "@/lib/dateUtils";

const CALORIE_GOAL = 2000;

export default function ProgressScreen() {
  const { user } = useAuth();
  const uid = user?.id ?? null;

  const calorieHistory = useCalorieHistory(uid, 7);
  const waterHistory = useWaterHistory(uid, 7);
  const weightChart = useWeightChart(uid, 30);
  const { latestWeight } = useWeightLog(uid);

  const weeklyCalories = calorieHistory.reduce((s, d) => s + d.calories, 0);

  const avgDailyCalories =
    calorieHistory.length > 0
      ? Math.round(weeklyCalories / calorieHistory.length)
      : 0;

  const avgDeficit = CALORIE_GOAL - avgDailyCalories;

  const weeklyWaterL =
    waterHistory.reduce((s, d) => s + d.amount_ml, 0) / 1000;

  const weightChange =
    weightChart.length >= 2
      ? weightChart[weightChart.length - 1].weight_kg -
        weightChart[0].weight_kg
      : null;

  const maxCal = Math.max(
    ...calorieHistory.map((d) => d.calories),
    CALORIE_GOAL
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <OfflineBanner pushContent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Tiến độ</Text>
          <Text style={styles.subtitle}>Tổng quan 7 ngày qua</Text>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard
            icon={<TrendingDown size={20} color="#10B981" />}
            bg="#ECFDF5"
            label="Avg Deficit"
            value={`${avgDeficit >= 0 ? "+" : ""}${avgDeficit}`}
            unit="kcal/ngày"
            valueColor={avgDeficit >= 0 ? "#10B981" : "#EF4444"}
          />

          <SummaryCard
            icon={<Droplets size={20} color="#3B82F6" />}
            bg="#EFF6FF"
            label="Tổng nước"
            value={weeklyWaterL.toFixed(1)}
            unit="L / 7 ngày"
            valueColor="#3B82F6"
          />
        </View>

        {weightChange != null && (
          <View style={styles.weightChangeCard}>
            <Scale
              size={18}
              color={weightChange <= 0 ? "#10B981" : "#EF4444"}
            />

            <Text style={styles.weightChangeLabel}>
              Cân nặng thay đổi (30 ngày)
            </Text>

            <Text
              style={[
                styles.weightChangeValue,
                { color: weightChange <= 0 ? "#10B981" : "#EF4444" },
              ]}
            >
              {weightChange > 0 ? "+" : ""}
              {weightChange.toFixed(1)} kg
            </Text>
          </View>
        )}

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Utensils size={16} color="#F59E0B" />
            <Text style={styles.chartTitle}>Calories 7 ngày</Text>
          </View>

          {calorieHistory.length > 0 ? (
            <View style={styles.barChart}>
              {calorieHistory.map((d, i) => {
                const pct = (d.calories / maxCal) * 100;
                const dayLabel = dateKeyToLocalDate(d.date).toLocaleDateString(
                  "vi-VN",
                  {
                    weekday: "short",
                  }
                );

                return (
                  <View key={`${d.date}-${i}`} style={styles.barCol}>
                    <Text style={styles.barValue}>
                      {d.calories > 0 ? Math.round(d.calories) : ""}
                    </Text>

                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${Math.max(pct, 2)}%` as any,
                            backgroundColor:
                              d.calories > CALORIE_GOAL
                                ? "#EF4444"
                                : "#F59E0B",
                          },
                        ]}
                      />
                    </View>

                    <Text style={styles.barLabel}>{dayLabel}</Text>
                  </View>
                );
              })}

              <View style={styles.goalLine} />
            </View>
          ) : (
            <View style={styles.noData}>
              <Text style={styles.noDataText}>Chưa có dữ liệu</Text>
            </View>
          )}

          <Text style={styles.goalHint}>
            Mục tiêu: {CALORIE_GOAL} kcal/ngày
          </Text>
        </View>

        <View style={styles.linksCard}>
          <Text style={styles.linksTitle}>Xem chi tiết</Text>

          <QuickLink
            label="Log bữa ăn"
            sub={`Avg ${avgDailyCalories} kcal/ngày`}
            icon={<Utensils size={18} color="#F59E0B" />}
            bg="#FFFBEB"
            onPress={() => router.push("/meal-log")}
          />

          <QuickLink
            label="Log nước uống"
            sub={`${weeklyWaterL.toFixed(1)}L tuần này`}
            icon={<Droplets size={18} color="#3B82F6" />}
            bg="#EFF6FF"
            onPress={() => router.push("/water-log")}
          />

          <QuickLink
            label="Theo dõi cân nặng"
            sub={
              latestWeight != null
                ? `${latestWeight.toFixed(1)} kg hiện tại`
                : "Chưa có dữ liệu"
            }
            icon={<Scale size={18} color="#8B5CF6" />}
            bg="#F5F3FF"
            isLast
            onPress={() => router.push("/weight-log")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({
  icon,
  bg,
  label,
  value,
  unit,
  valueColor,
}: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: string;
  unit: string;
  valueColor: string;
}) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: bg }]}>
      {icon}
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color: valueColor }]}>{value}</Text>
      <Text style={styles.summaryUnit}>{unit}</Text>
    </View>
  );
}

function QuickLink({
  icon,
  bg,
  label,
  sub,
  onPress,
  isLast,
}: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  sub: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable
      style={[styles.linkItem, !isLast && styles.linkBorder]}
      onPress={onPress}
    >
      <View style={[styles.linkIcon, { backgroundColor: bg }]}>{icon}</View>

      <View style={{ flex: 1 }}>
        <Text style={styles.linkLabel}>{label}</Text>
        <Text style={styles.linkSub}>{sub}</Text>
      </View>

      <ChevronRight size={16} color="#CBD5E1" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9F8" },
  scroll: { paddingHorizontal: 20, paddingBottom: 130 },

  header: { paddingTop: 12, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 13, color: "#94A3B8", marginTop: 4 },

  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  summaryCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  summaryLabel: { fontSize: 12, color: "#64748B", marginTop: 6 },
  summaryValue: { fontSize: 24, fontWeight: "800" },
  summaryUnit: { fontSize: 11, color: "#94A3B8" },

  weightChangeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  weightChangeLabel: { flex: 1, fontSize: 14, color: "#64748B" },
  weightChangeValue: { fontSize: 18, fontWeight: "800" },

  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  chartTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  barChart: {
    flexDirection: "row",
    height: 120,
    alignItems: "flex-end",
    gap: 6,
    position: "relative",
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
  barValue: { fontSize: 8, color: "#94A3B8", marginBottom: 2 },
  barTrack: {
    flex: 1,
    width: "70%",
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFill: { width: "100%", borderRadius: 4 },
  barLabel: { fontSize: 9, color: "#94A3B8", marginTop: 4 },
  goalLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#FCD34D",
    bottom: 20,
    opacity: 0.5,
  },
  goalHint: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 8,
    textAlign: "center",
  },
  noData: { height: 80, justifyContent: "center", alignItems: "center" },
  noDataText: { color: "#CBD5E1" },

  linksCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  linksTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  linkBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  linkLabel: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  linkSub: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
});