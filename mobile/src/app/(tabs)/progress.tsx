import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import {
  Activity,
  ChevronLeft,
  Flame,
  PieChart,
  Scale,
  Target,
  TrendingDown,
} from "lucide-react-native";

import { OfflineBanner } from "@/components/OfflineBanner";
import { useAuth } from "@/context/AuthContext";
import {
  getDailyCalorieHistory,
  getDailyMacros,
} from "@/lib/repositories/mealRepository";
import { useWeightChart, useWeightLog } from "@/hooks/useWeightLog";

const CALORIE_GOAL = 2000;
const PROTEIN_GOAL = 120;
const CARBS_GOAL = 250;
const FAT_GOAL = 65;

type Period = "day" | "week" | "month";

type MacroSummary = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type CalorieHistoryItem = {
  date: string;
  calories: number;
};

type ChartItem = {
  label: string;
  calories: number;
};

const EMPTY_MACROS: MacroSummary = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
};

function getDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function getPeriodDays(period: Period): number {
  if (period === "month") return 30;
  if (period === "day") return 1;
  return 7;
}

function buildDateKeys(days: number): string[] {
  const now = new Date();
  const keys: string[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    keys.push(getDateKey(date));
  }

  return keys;
}

function getWeekdayLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateKey.slice(5);
  }

  return date.toLocaleDateString("en-US", {
    weekday: "short",
  });
}

function normalizeCalorieHistory(
  rawHistory: CalorieHistoryItem[],
  period: Period
): ChartItem[] {
  const days = getPeriodDays(period);
  const rawMap = new Map(
    rawHistory.map((item) => [item.date, Math.round(item.calories)])
  );

  if (period === "month") {
    const keys = buildDateKeys(30);
    const dailyData = keys.map((key) => ({
      date: key,
      calories: rawMap.get(key) ?? 0,
    }));

    const groups: ChartItem[] = [];
    const groupSize = 6;

    for (let i = 0; i < dailyData.length; i += groupSize) {
      const group = dailyData.slice(i, i + groupSize);
      const total = group.reduce((sum, item) => sum + item.calories, 0);
      const avg = group.length > 0 ? total / group.length : 0;

      groups.push({
        label: `W${groups.length + 1}`,
        calories: Math.round(avg),
      });
    }

    return groups;
  }

  const keys = buildDateKeys(days);

  return keys.map((key) => ({
    label: period === "day" ? "Today" : getWeekdayLabel(key),
    calories: rawMap.get(key) ?? 0,
  }));
}

function getMacroPercents(macros: MacroSummary) {
  const proteinCalories = macros.protein * 4;
  const carbsCalories = macros.carbs * 4;
  const fatCalories = macros.fat * 9;
  const total = proteinCalories + carbsCalories + fatCalories;

  if (total <= 0) {
    return {
      protein: 0,
      carbs: 0,
      fat: 0,
    };
  }

  return {
    protein: Math.round((proteinCalories / total) * 100),
    carbs: Math.round((carbsCalories / total) * 100),
    fat: Math.round((fatCalories / total) * 100),
  };
}

export default function ProgressScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [selectedPeriod, setSelectedPeriod] = useState<Period>("week");
  const [calorieHistory, setCalorieHistory] = useState<CalorieHistoryItem[]>([]);
  const [todayMacros, setTodayMacros] = useState<MacroSummary>(EMPTY_MACROS);

  const weightChart = useWeightChart(userId, 7);
  const { latestWeight } = useWeightLog(userId);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadProgressData() {
        if (!userId) {
          setCalorieHistory([]);
          setTodayMacros(EMPTY_MACROS);
          return;
        }

        try {
          const days = getPeriodDays(selectedPeriod);

          const [history, macros] = await Promise.all([
            getDailyCalorieHistory(userId, days),
            getDailyMacros(userId, getDateKey(new Date())),
          ]);

          if (!isActive) return;

          setCalorieHistory(history);
          setTodayMacros(macros);
        } catch (error) {
          console.warn("[ProgressScreen] Failed to load progress data:", error);

          if (!isActive) return;

          setCalorieHistory([]);
          setTodayMacros(EMPTY_MACROS);
        }
      }

      loadProgressData();

      return () => {
        isActive = false;
      };
    }, [selectedPeriod, userId])
  );

  const chartData = useMemo(
    () => normalizeCalorieHistory(calorieHistory, selectedPeriod),
    [calorieHistory, selectedPeriod]
  );

  const activeCalorieDays = chartData.filter((item) => item.calories > 0);
  const totalCalories = chartData.reduce(
    (sum, item) => sum + item.calories,
    0
  );

  const averageCalories =
    activeCalorieDays.length > 0
      ? Math.round(totalCalories / activeCalorieDays.length)
      : 0;

  const calorieDeficit = averageCalories - CALORIE_GOAL;

  const daysOnTarget = chartData.filter(
    (item) => item.calories > 0 && item.calories <= CALORIE_GOAL
  ).length;

  const maxChartCalories = Math.max(
    CALORIE_GOAL,
    ...chartData.map((item) => item.calories),
    1
  );

  const macroPercents = getMacroPercents(todayMacros);

  const weightChange =
    weightChart.length >= 2
      ? weightChart[weightChart.length - 1].weight_kg -
        weightChart[0].weight_kg
      : null;

  const weightMessage =
    weightChange == null
      ? "Log your weight to unlock weekly insights"
      : weightChange <= 0
        ? `🔥 Great job! You lost ${Math.abs(weightChange).toFixed(1)}kg this week`
        : `Keep going! Weight changed +${weightChange.toFixed(1)}kg this week`;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <OfflineBanner pushContent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={20} color="#0F172A" />
          </Pressable>

          <View>
            <Text style={styles.title}>Progress</Text>
            <Text style={styles.subtitle}>Your nutrition journey</Text>
          </View>
        </View>

        <View style={styles.periodTabs}>
          <PeriodButton
            label="Day"
            active={selectedPeriod === "day"}
            onPress={() => setSelectedPeriod("day")}
          />

          <PeriodButton
            label="Week"
            active={selectedPeriod === "week"}
            onPress={() => setSelectedPeriod("week")}
          />

          <PeriodButton
            label="Month"
            active={selectedPeriod === "month"}
            onPress={() => setSelectedPeriod("month")}
          />
        </View>

        <View style={styles.calorieCard}>
          <View style={styles.cardTopRow}>
            <View>
              <Text style={styles.cardLabel}>Average Calories</Text>

              <View style={styles.bigNumberRow}>
                <Text style={styles.bigNumber}>
                  {formatNumber(averageCalories)}
                </Text>
                <Text style={styles.bigUnit}>kcal</Text>
              </View>
            </View>

            <View style={styles.greenCircle}>
              <Activity size={24} color="#10B981" />
            </View>
          </View>

          <View style={styles.chartWrapper}>
            <View style={styles.yAxis}>
              <Text style={styles.axisText}>{formatNumber(maxChartCalories)}</Text>
              <Text style={styles.axisText}>
                {formatNumber(maxChartCalories * 0.75)}
              </Text>
              <Text style={styles.axisText}>
                {formatNumber(maxChartCalories * 0.5)}
              </Text>
              <Text style={styles.axisText}>
                {formatNumber(maxChartCalories * 0.25)}
              </Text>
              <Text style={styles.axisText}>0</Text>
            </View>

            <View style={styles.barArea}>
              {chartData.map((item, index) => {
                const heightPercent =
                  item.calories > 0
                    ? Math.max((item.calories / maxChartCalories) * 100, 6)
                    : 2;

                const isOverGoal = item.calories > CALORIE_GOAL;

                return (
                  <View
                    key={`${item.label}-${index}`}
                    style={styles.barColumn}
                  >
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${heightPercent}%`,
                            backgroundColor: isOverGoal ? "#FF3B68" : "#10B981",
                          },
                        ]}
                      />
                    </View>

                    <Text style={styles.barLabel}>{item.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.statRow}>
          <SmallStatCard
            icon={<TrendingDown size={18} color="#10B981" />}
            iconBackground="#E8FFF5"
            label="Calorie Deficit"
            value={`${calorieDeficit > 0 ? "+" : ""}${formatNumber(
              calorieDeficit
            )} kcal`}
            valueColor={calorieDeficit > 0 ? "#FF3B68" : "#061126"}
          />

          <SmallStatCard
            icon={<Target size={18} color="#06B6D4" />}
            iconBackground="#E8FAFF"
            label="Days on Target"
            value={`${daysOnTarget} / ${chartData.length}`}
            valueColor="#061126"
          />
        </View>

        <View style={styles.macroCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.purpleCircle}>
              <PieChart size={19} color="#8B5CF6" />
            </View>

            <View>
              <Text style={styles.sectionTitle}>Macro Distribution</Text>
              <Text style={styles.sectionSubtitle}>
                Comprehensive breakdown
              </Text>
            </View>
          </View>

          <View style={styles.macroBody}>
            <DonutPreview hasData={todayMacros.calories > 0} />

            <View style={styles.legendBlock}>
              <LegendItem
                color="#10B981"
                label="Protein"
                percent={macroPercents.protein}
                gram={todayMacros.protein}
              />

              <LegendItem
                color="#8B5CF6"
                label="Carbs"
                percent={macroPercents.carbs}
                gram={todayMacros.carbs}
              />

              <LegendItem
                color="#F97316"
                label="Fat"
                percent={macroPercents.fat}
                gram={todayMacros.fat}
              />
            </View>
          </View>

          <View style={styles.goalList}>
            <MacroGoal
              label="Protein"
              current={todayMacros.protein}
              goal={PROTEIN_GOAL}
              color="#10B981"
            />

            <MacroGoal
              label="Carbs"
              current={todayMacros.carbs}
              goal={CARBS_GOAL}
              color="#8B5CF6"
            />

            <MacroGoal
              label="Fat"
              current={todayMacros.fat}
              goal={FAT_GOAL}
              color="#F97316"
            />
          </View>
        </View>

        <View style={styles.weightCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.blueCircle}>
              <Scale size={19} color="#06B6D4" />
            </View>

            <View>
              <Text style={styles.sectionTitle}>Weight Trend</Text>
              <Text style={styles.sectionSubtitle}>Your 7-day progress</Text>
            </View>
          </View>

          {weightChart.length >= 2 ? (
            <WeightTrendChart
              data={weightChart.slice(-7).map((item, index) => ({
                label: `D${index + 1}`,
                weight: item.weight_kg,
              }))}
            />
          ) : (
            <View style={styles.emptyWeightBox}>
              <Text style={styles.emptyWeightTitle}>
                {latestWeight != null
                  ? `${latestWeight.toFixed(1)} kg current weight`
                  : "No weight data yet"}
              </Text>

              <Text style={styles.emptyWeightText}>
                Add weight logs to see the weekly trend.
              </Text>
            </View>
          )}

          <View style={styles.weightMessage}>
            <Flame size={15} color="#F97316" />
            <Text style={styles.weightMessageText}>{weightMessage}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PeriodButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.periodButton, active && styles.periodButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.periodText, active && styles.periodTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SmallStatCard({
  icon,
  iconBackground,
  label,
  value,
  valueColor,
}: {
  icon: ReactNode;
  iconBackground: string;
  label: string;
  value: string;
  valueColor: string;
}) {
  return (
    <View style={styles.smallCard}>
      <View style={[styles.smallIcon, { backgroundColor: iconBackground }]}>
        {icon}
      </View>

      <Text style={styles.smallLabel}>{label}</Text>
      <Text style={[styles.smallValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function DonutPreview({ hasData }: { hasData: boolean }) {
  return (
    <View style={styles.donutBox}>
      <View
        style={[
          styles.donutRing,
          {
            borderTopColor: hasData ? "#10B981" : "#CBD5E1",
            borderRightColor: hasData ? "#10B981" : "#CBD5E1",
            transform: [{ rotate: "20deg" }],
          },
        ]}
      />

      <View
        style={[
          styles.donutRing,
          {
            borderLeftColor: hasData ? "#8B5CF6" : "#CBD5E1",
            borderBottomColor: hasData ? "#8B5CF6" : "#CBD5E1",
            transform: [{ rotate: "18deg" }],
          },
        ]}
      />

      <View
        style={[
          styles.donutRingSmall,
          {
            borderRightColor: hasData ? "#F97316" : "#CBD5E1",
            borderBottomColor: hasData ? "#F97316" : "#CBD5E1",
            transform: [{ rotate: "15deg" }],
          },
        ]}
      />

      <View style={styles.donutHole} />
    </View>
  );
}

function LegendItem({
  color,
  label,
  percent,
  gram,
}: {
  color: string;
  label: string;
  percent: number;
  gram: number;
}) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />

      <Text style={styles.legendLabel}>{label}</Text>

      <Text style={styles.legendValue}>
        {percent}% · {Math.round(gram)}g
      </Text>
    </View>
  );
}

function MacroGoal({
  label,
  current,
  goal,
  color,
}: {
  label: string;
  current: number;
  goal: number;
  color: string;
}) {
  const progress = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;

  return (
    <View style={styles.goalItem}>
      <View style={styles.goalHeader}>
        <Text style={styles.goalLabel}>{label}</Text>
        <Text style={styles.goalValue}>
          {Math.round(current)} / {goal}g
        </Text>
      </View>

      <View style={styles.goalTrack}>
        <View
          style={[
            styles.goalFill,
            {
              width: `${progress}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
}

function WeightTrendChart({
  data,
}: {
  data: {
    label: string;
    weight: number;
  }[];
}) {
  const chartWidth = 240;
  const chartHeight = 128;
  const paddingX = 20;
  const paddingTop = 16;
  const paddingBottom = 26;

  const weights = data.map((item) => item.weight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const minAxis = Math.floor((minWeight - 0.4) * 10) / 10;
  const maxAxis = Math.ceil((maxWeight + 0.4) * 10) / 10;
  const range = Math.max(maxAxis - minAxis, 1);

  const plotWidth = chartWidth - paddingX * 2;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const points = data.map((item, index) => {
    const x =
      paddingX +
      (data.length === 1
        ? plotWidth / 2
        : (plotWidth / (data.length - 1)) * index);

    const y = paddingTop + ((maxAxis - item.weight) / range) * plotHeight;

    return {
      ...item,
      x,
      y,
    };
  });

  return (
    <View style={styles.weightChart}>
      <View style={styles.weightAxis}>
        <Text style={styles.weightAxisText}>{maxAxis.toFixed(1)}</Text>
        <Text style={styles.weightAxisText}>
          {((maxAxis + minAxis) / 2).toFixed(1)}
        </Text>
        <Text style={styles.weightAxisText}>{minAxis.toFixed(1)}</Text>
      </View>

      <View
        style={[
          styles.weightPlot,
          {
            width: chartWidth,
            height: chartHeight,
          },
        ]}
      >
        <View style={[styles.weightGridLine, { top: paddingTop }]} />
        <View
          style={[styles.weightGridLine, { top: paddingTop + plotHeight / 2 }]}
        />
        <View style={[styles.weightGridLine, { top: paddingTop + plotHeight }]} />

        {points.slice(0, -1).map((point, index) => {
          const nextPoint = points[index + 1];
          const dx = nextPoint.x - point.x;
          const dy = nextPoint.y - point.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);

          return (
            <View
              key={`line-${index}`}
              style={[
                styles.weightLine,
                {
                  width: length,
                  left: point.x + dx / 2 - length / 2,
                  top: point.y + dy / 2,
                  transform: [{ rotate: `${angle}deg` }],
                },
              ]}
            />
          );
        })}

        {points.map((point) => (
          <View
            key={`point-${point.label}`}
            style={[
              styles.weightPoint,
              {
                left: point.x - 4,
                top: point.y - 4,
              },
            ]}
          />
        ))}

        {points.map((point) => (
          <Text
            key={`label-${point.label}`}
            style={[
              styles.weightPointLabel,
              {
                left: point.x - 10,
                top: chartHeight - 17,
              },
            ]}
          >
            {point.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9F8",
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 130,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: 10,
    paddingBottom: 22,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#061126",
  },
  subtitle: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
  },

  periodTabs: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5ECF2",
    alignItems: "center",
    justifyContent: "center",
  },
  periodButtonActive: {
    backgroundColor: "#02A66A",
    borderColor: "#02A66A",
    shadowColor: "#02A66A",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  periodText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#64748B",
  },
  periodTextActive: {
    color: "#FFFFFF",
  },

  calorieCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 22,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94A3B8",
  },
  bigNumberRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    marginTop: 2,
  },
  bigNumber: {
    fontSize: 34,
    fontWeight: "900",
    color: "#061126",
  },
  bigUnit: {
    fontSize: 16,
    fontWeight: "800",
    color: "#64748B",
    marginBottom: 5,
  },
  greenCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E8FFF5",
    alignItems: "center",
    justifyContent: "center",
  },

  chartWrapper: {
    flexDirection: "row",
    height: 170,
  },
  yAxis: {
    width: 38,
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  axisText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A7B3C4",
  },
  barArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
    paddingTop: 8,
  },
  barColumn: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barTrack: {
    width: 22,
    height: 130,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    borderRadius: 8,
  },
  barLabel: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
  },

  statRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 16,
  },
  smallCard: {
    flex: 1,
    minHeight: 126,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  smallIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  smallLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94A3B8",
    marginBottom: 6,
  },
  smallValue: {
    fontSize: 21,
    fontWeight: "900",
  },

  macroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 22,
    marginBottom: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  purpleCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F3ECFF",
    alignItems: "center",
    justifyContent: "center",
  },
  blueCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E8FAFF",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#061126",
  },
  sectionSubtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
  },

  macroBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 18,
  },
  donutBox: {
    width: 118,
    height: 118,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  donutRing: {
    position: "absolute",
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 16,
    borderColor: "transparent",
  },
  donutRingSmall: {
    position: "absolute",
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 16,
    borderColor: "transparent",
  },
  donutHole: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#FFFFFF",
  },

  legendBlock: {
    flex: 1,
    gap: 13,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  legendValue: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
  },

  goalList: {
    gap: 12,
  },
  goalItem: {
    gap: 7,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  goalLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
  },
  goalValue: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0F172A",
  },
  goalTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
  },
  goalFill: {
    height: "100%",
    borderRadius: 999,
  },

  weightCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 22,
    marginBottom: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  emptyWeightBox: {
    minHeight: 112,
    borderRadius: 22,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  emptyWeightTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
  },
  emptyWeightText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
    textAlign: "center",
  },
  weightMessage: {
    marginTop: 16,
    minHeight: 38,
    borderRadius: 16,
    backgroundColor: "#EFFFF7",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
  },
  weightMessageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    color: "#02A66A",
  },

  weightChart: {
    flexDirection: "row",
    alignItems: "center",
  },
  weightAxis: {
    width: 38,
    height: 128,
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  weightAxisText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A7B3C4",
  },
  weightPlot: {
    position: "relative",
  },
  weightGridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#EDF2F7",
  },
  weightLine: {
    position: "absolute",
    height: 3,
    borderRadius: 3,
    backgroundColor: "#06B6D4",
  },
  weightPoint: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#06B6D4",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  weightPointLabel: {
    position: "absolute",
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
  },
});