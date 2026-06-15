/**
 * Meal History screen.
 *
 * Important:
 * - This file is Meal History, not Log Meal input.
 * - Delete is immediate so Home calories update right away.
 * - Undo restores the deleted meal by inserting it again.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react-native";

import { OfflineBanner } from "@/components/OfflineBanner";
import { useAuth } from "@/context/AuthContext";
import {
  deleteMeal,
  getMealsByDate,
  insertMeal,
  MealEntry,
  MealType,
} from "@/lib/repositories/mealRepository";

type MealGroupKey = "breakfast" | "lunch" | "dinner" | "snack";

type MealGroupConfig = {
  key: MealGroupKey;
  label: string;
  icon: string;
  mealTypes: MealType[];
};

const MEAL_GROUPS: MealGroupConfig[] = [
  {
    key: "breakfast",
    label: "Breakfast",
    icon: "☕",
    mealTypes: ["breakfast"],
  },
  {
    key: "lunch",
    label: "Lunch",
    icon: "🥗",
    mealTypes: ["lunch"],
  },
  {
    key: "dinner",
    label: "Dinner",
    icon: "🌙",
    mealTypes: ["dinner"],
  },
  {
    key: "snack",
    label: "Snack",
    icon: "🍏",
    mealTypes: ["snack", "other"],
  },
];

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function addDays(dateKey: string, days: number) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);

  return formatDateKey(date);
}

function formatDisplayDate(dateKey: string) {
  return parseDateKey(dateKey).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateCaption(dateKey: string, today: string) {
  if (dateKey === today) return "Today";

  return parseDateKey(dateKey).toLocaleDateString("en-US", {
    weekday: "long",
  });
}

function safeUserId(value: unknown) {
  const parsed = Number(value);

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return 1;
}

export function MealLog() {
  const { user } = useAuth();

  const today = formatDateKey(new Date());
  const userId = safeUserId(user?.id);

  const [selectedDate, setSelectedDate] = useState(today);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [undoMeal, setUndoMeal] = useState<MealEntry | null>(null);

  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMeals = useCallback(async () => {
    try {
      setIsLoading(true);
      const loadedMeals = await getMealsByDate(userId, selectedDate);
      setMeals(loadedMeals);
    } catch (error) {
      console.error("[MealLog] load meals failed:", error);
      setMeals([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, userId]);

  useEffect(() => {
    loadMeals();
  }, [loadMeals]);

  useEffect(() => {
    setUndoMeal(null);

    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
  }, [selectedDate]);

  useEffect(() => {
    return () => {
      if (undoTimer.current) {
        clearTimeout(undoTimer.current);
      }
    };
  }, []);

  const totalCalories = useMemo(
    () => meals.reduce((sum, meal) => sum + meal.calories, 0),
    [meals]
  );

  const groupedMeals = useMemo(
    () =>
      MEAL_GROUPS.map((group) => {
        const groupMeals = meals.filter((meal) =>
          group.mealTypes.includes(meal.meal_type)
        );

        return {
          ...group,
          meals: groupMeals,
        };
      }),
    [meals]
  );

  const selectedDateCaption = formatDateCaption(selectedDate, today);
  const selectedDateText = formatDisplayDate(selectedDate);
  const canGoNext = selectedDate < today;

  async function handleDelete(meal: MealEntry) {
    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }

    const beforeDelete = meals;

    setUndoMeal(meal);
    setMeals((currentMeals) =>
      currentMeals.filter((currentMeal) => currentMeal.id !== meal.id)
    );

    try {
      await deleteMeal(meal.id, userId);
    } catch (error) {
      console.error("[MealLog] delete failed:", error);
      setMeals(beforeDelete);
      setUndoMeal(null);
      return;
    }

    undoTimer.current = setTimeout(() => {
      setUndoMeal(null);
      undoTimer.current = null;
    }, 3500);
  }

  async function handleUndoDelete() {
    if (!undoMeal) return;

    const mealToRestore = undoMeal;

    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }

    setUndoMeal(null);

    try {
      await insertMeal({
        userId,
        name: mealToRestore.name,
        calories: mealToRestore.calories,
        proteinG: mealToRestore.protein_g,
        carbsG: mealToRestore.carbs_g,
        fatG: mealToRestore.fat_g,
        mealType: mealToRestore.meal_type,
        loggedAt: mealToRestore.logged_at,
      });

      await loadMeals();
    } catch (error) {
      console.error("[MealLog] undo delete failed:", error);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <OfflineBanner pushContent />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#0F172A" />
          </Pressable>

          <View>
            <Text style={styles.title}>Meal History</Text>
            <Text style={styles.subtitle}>Your nutrition records</Text>
          </View>
        </View>

        <View style={styles.dateCard}>
          <Pressable
            style={styles.dateBtn}
            onPress={() => setSelectedDate(addDays(selectedDate, -1))}
          >
            <ChevronLeft size={20} color="#0F172A" />
          </Pressable>

          <View style={styles.dateCenter}>
            <Text style={styles.dateCaption}>{selectedDateCaption}</Text>
            <Text style={styles.dateTitle}>{selectedDateText}</Text>
          </View>

          <Pressable
            style={[styles.dateBtn, !canGoNext && styles.dateBtnDisabled]}
            disabled={!canGoNext}
            onPress={() => setSelectedDate(addDays(selectedDate, 1))}
          >
            <ChevronRight size={20} color={canGoNext ? "#0F172A" : "#CBD5E1"} />
          </Pressable>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Calories Today</Text>
          <Text style={styles.totalValue}>{Math.round(totalCalories)}</Text>
          <Text style={styles.totalUnit}>kcal consumed</Text>
        </View>

        <View style={styles.groupsWrap}>
          {groupedMeals.map((group) => (
            <MealGroup
              key={group.key}
              label={group.label}
              icon={group.icon}
              meals={group.meals}
              isLoading={isLoading}
              onDelete={handleDelete}
            />
          ))}
        </View>
      </ScrollView>

      {undoMeal ? (
        <View style={styles.undoToast}>
          <Text style={styles.undoText} numberOfLines={1}>
            Deleted “{undoMeal.name}”
          </Text>

          <Pressable onPress={handleUndoDelete} hitSlop={10}>
            <Text style={styles.undoAction}>Undo</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function MealGroup({
  label,
  icon,
  meals,
  isLoading,
  onDelete,
}: {
  label: string;
  icon: string;
  meals: MealEntry[];
  isLoading: boolean;
  onDelete: (meal: MealEntry) => void;
}) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <View style={styles.groupIcon}>
          <Text style={styles.groupIconText}>{icon}</Text>
        </View>
        <Text style={styles.groupTitle}>{label}</Text>
      </View>

      {meals.length > 0 ? (
        <View style={styles.groupList}>
          {meals.map((meal) => (
            <MealItem
              key={meal.id}
              meal={meal}
              onDelete={() => onDelete(meal)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyMealBox}>
          <Text style={styles.emptyMealText}>
            {isLoading ? "Loading meals..." : "No meals logged yet"}
          </Text>
        </View>
      )}
    </View>
  );
}

function MealItem({
  meal,
  onDelete,
}: {
  meal: MealEntry;
  onDelete: () => void;
}) {
  return (
    <View style={styles.mealItem}>
      <View style={styles.mealInfo}>
        <Text style={styles.mealName} numberOfLines={1}>
          {meal.name}
        </Text>
        <Text style={styles.mealCalories}>
          {Math.round(meal.calories)} kcal
        </Text>
      </View>

      <Pressable onPress={onDelete} style={styles.deleteBtn} hitSlop={8}>
        <Trash2 size={16} color="#EF4444" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9F8",
  },
  scrollView: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 130,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#071426",
  },
  subtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 3,
    fontWeight: "500",
  },
  dateCard: {
    height: 72,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  dateBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  dateBtnDisabled: {
    backgroundColor: "#F8FAFC",
  },
  dateCenter: {
    alignItems: "center",
  },
  dateCaption: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "700",
    marginBottom: 3,
  },
  dateTitle: {
    fontSize: 16,
    color: "#071426",
    fontWeight: "900",
  },
  totalCard: {
    minHeight: 126,
    borderRadius: 24,
    backgroundColor: "#10CDBA",
    paddingHorizontal: 22,
    paddingVertical: 20,
    marginBottom: 24,
    justifyContent: "center",
  },
  totalLabel: {
    fontSize: 13,
    color: "#EFFFFB",
    fontWeight: "700",
    marginBottom: 10,
  },
  totalValue: {
    fontSize: 38,
    lineHeight: 42,
    color: "#FFFFFF",
    fontWeight: "900",
  },
  totalUnit: {
    fontSize: 14,
    color: "#EFFFFB",
    fontWeight: "600",
    marginTop: 4,
  },
  groupsWrap: {
    gap: 20,
  },
  group: {
    gap: 10,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  groupIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EAFBF5",
    alignItems: "center",
    justifyContent: "center",
  },
  groupIconText: {
    fontSize: 13,
  },
  groupTitle: {
    fontSize: 19,
    color: "#071426",
    fontWeight: "900",
  },
  groupList: {
    gap: 10,
  },
  mealItem: {
    minHeight: 72,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    paddingLeft: 18,
    paddingRight: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  mealInfo: {
    flex: 1,
    paddingRight: 12,
  },
  mealName: {
    fontSize: 15,
    color: "#071426",
    fontWeight: "900",
    marginBottom: 4,
  },
  mealCalories: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "700",
  },
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyMealBox: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyMealText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "700",
  },
  undoToast: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 92,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "#071426",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  undoText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  undoAction: {
    color: "#10CDBA",
    fontSize: 13,
    fontWeight: "900",
  },
});