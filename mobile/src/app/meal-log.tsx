import React, { useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  ArrowLeft,
  Camera,
  Clock3,
  Search,
  Sparkles,
} from "lucide-react-native";

import { OfflineBanner } from "@/components/OfflineBanner";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import {
  getMealHistory,
  MealEntry,
} from "@/lib/repositories/mealRepository";

type MealEstimate = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  potassium: number;
};

const SUGGESTIONS: MealEstimate[] = [
  {
    name: "1 bowl of pho",
    calories: 520,
    protein: 26,
    carbs: 64,
    fat: 16,
    fiber: 3.2,
    sugar: 6,
    sodium: 890,
    potassium: 540,
  },
  {
    name: "Grilled chicken + rice",
    calories: 610,
    protein: 42,
    carbs: 72,
    fat: 14,
    fiber: 4.1,
    sugar: 5,
    sodium: 720,
    potassium: 690,
  },
  {
    name: "2 eggs + bread",
    calories: 380,
    protein: 22,
    carbs: 35,
    fat: 16,
    fiber: 2.4,
    sugar: 4,
    sodium: 610,
    potassium: 330,
  },
  {
    name: "Beef steak + salad",
    calories: 670,
    protein: 48,
    carbs: 24,
    fat: 34,
    fiber: 5.6,
    sugar: 7,
    sodium: 760,
    potassium: 780,
  },
  {
    name: "Banana smoothie",
    calories: 310,
    protein: 9,
    carbs: 58,
    fat: 6,
    fiber: 4.8,
    sugar: 31,
    sodium: 180,
    potassium: 620,
  },
  {
    name: "Chicken soup",
    calories: 420,
    protein: 31,
    carbs: 38,
    fat: 12,
    fiber: 3.5,
    sugar: 5,
    sodium: 840,
    potassium: 510,
  },
];

function createEstimateFromText(text: string): MealEstimate {
  const normalized = text.trim().toLowerCase();

  const matched = SUGGESTIONS.find((item) =>
    normalized.includes(item.name.toLowerCase())
  );

  if (matched) return matched;

  return {
    name: text.trim(),
    calories: 520,
    protein: 28,
    carbs: 62,
    fat: 16,
    fiber: 3.2,
    sugar: 12,
    sodium: 760,
    potassium: 480,
  };
}

export default function MealLogScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const userId = user ? Number(user.id) : 1;

  const [mealText, setMealText] = useState("");
  const [recentMeals, setRecentMeals] = useState<MealEntry[]>([]);

  const trimmedMealText = mealText.trim();

  const selectedSuggestion = useMemo(
    () =>
      SUGGESTIONS.find(
        (item) => item.name.toLowerCase() === trimmedMealText.toLowerCase()
      ),
    [trimmedMealText]
  );

  useEffect(() => {
    let mounted = true;

    async function loadRecentMeals() {
      try {
        const meals = await getMealHistory(userId, 3, 0);

        if (mounted) {
          setRecentMeals(meals);
        }
      } catch (error) {
        console.error("[MealLogScreen] load recent meals failed:", error);
      }
    }

    loadRecentMeals();

    return () => {
      mounted = false;
    };
  }, [userId]);

  function goToAiResult(estimate: MealEstimate) {
    router.push({
      pathname: "/ai-result",
      params: {
        name: estimate.name,
        calories: String(estimate.calories),
        protein: String(estimate.protein),
        carbs: String(estimate.carbs),
        fat: String(estimate.fat),
        fiber: String(estimate.fiber),
        sugar: String(estimate.sugar),
        sodium: String(estimate.sodium),
        potassium: String(estimate.potassium),
      },
    });
  }

  function handleAnalyzeMeal() {
    Keyboard.dismiss();

    if (!trimmedMealText) {
      showToast({
        type: "warning",
        title: "Missing meal",
        message: "Please describe your meal before analyzing.",
      });
      return;
    }

    const estimate = selectedSuggestion ?? createEstimateFromText(trimmedMealText);
    goToAiResult(estimate);
  }

  function handleRecentMealPress(meal: MealEntry) {
    goToAiResult({
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein_g,
      carbs: meal.carbs_g,
      fat: meal.fat_g,
      fiber: 3.2,
      sugar: 12,
      sodium: 760,
      potassium: 480,
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <OfflineBanner pushContent />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={21} color="#0F172A" />
          </Pressable>

          <Text style={styles.title}>Log Meal</Text>
        </View>

        <View style={styles.aiCard}>
          <View style={styles.aiTextWrap}>
            <View style={styles.aiLabelRow}>
              <Sparkles size={15} color="#FFFFFF" />
              <Text style={styles.aiLabel}>AI Nutrition Scan</Text>
            </View>

            <Text style={styles.aiTitle}>Scan meal{"\n"}with AI</Text>
            <Text style={styles.aiSubtitle}>
              Take a photo and instantly estimate calories & macros.
            </Text>
          </View>

          <Pressable
            style={styles.cameraButton}
            onPress={() =>
              showToast({
                type: "info",
                title: "Coming soon",
                message: "Camera scan will be connected later.",
              })
            }
          >
            <Camera size={28} color="#FFFFFF" />
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>Describe your meal</Text>

        <View style={styles.inputWrap}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            style={styles.input}
            value={mealText}
            onChangeText={setMealText}
            placeholder="E.g. 1 bowl of pho + peach tea"
            placeholderTextColor="#94A3B8"
            returnKeyType="done"
            onSubmitEditing={handleAnalyzeMeal}
          />
        </View>

        <Text style={[styles.sectionLabel, styles.suggestionTitle]}>
          Suggestions
        </Text>

        <View style={styles.suggestions}>
          {SUGGESTIONS.map((item) => {
            const active =
              item.name.toLowerCase() === trimmedMealText.toLowerCase();

            return (
              <Pressable
                key={item.name}
                style={[styles.suggestionPill, active && styles.activePill]}
                onPress={() => setMealText(item.name)}
              >
                <Text
                  style={[
                    styles.suggestionText,
                    active && styles.activePillText,
                  ]}
                >
                  {item.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.analyzeButton} onPress={handleAnalyzeMeal}>
          <View style={styles.analyzeIcon}>
            <Sparkles size={17} color="#FFFFFF" />
          </View>
          <Text style={styles.analyzeText}>Analyze Meal</Text>
        </Pressable>

        <View style={styles.recentHeader}>
          <Text style={styles.recentTitle}>Recent</Text>
          <Pressable onPress={() => router.push("/meal-history")}>
            <Text style={styles.viewAllText}>View all</Text>
          </Pressable>
        </View>

        <View style={styles.recentList}>
          {recentMeals.length > 0 ? (
            recentMeals.map((meal) => (
              <Pressable
                key={meal.id}
                style={styles.recentItem}
                onPress={() => handleRecentMealPress(meal)}
              >
                <View style={styles.recentIcon}>
                  <Clock3 size={18} color="#F97316" />
                </View>

                <View style={styles.recentInfo}>
                  <Text style={styles.recentName} numberOfLines={1}>
                    {meal.name}
                  </Text>
                  <Text style={styles.recentCalories}>
                    {Math.round(meal.calories)} kcal
                  </Text>
                </View>
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyRecent}>
              <Text style={styles.emptyText}>No recent meals yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
    marginBottom: 22,
  },
  backButton: {
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
    fontSize: 23,
    fontWeight: "900",
    color: "#071426",
  },
  aiCard: {
    minHeight: 170,
    borderRadius: 26,
    backgroundColor: "#10CDBA",
    padding: 22,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  aiTextWrap: {
    flex: 1,
    paddingRight: 16,
  },
  aiLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  aiLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  aiTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 31,
    fontWeight: "900",
    marginBottom: 12,
  },
  aiSubtitle: {
    color: "#ECFFFB",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  cameraButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  sectionLabel: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "700",
    marginBottom: 10,
  },
  inputWrap: {
    height: 58,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 22,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  input: {
    flex: 1,
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700",
  },
  suggestionTitle: {
    marginBottom: 12,
  },
  suggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 26,
  },
  suggestionPill: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 21,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
  },
  activePill: {
    backgroundColor: "#10B981",
  },
  suggestionText: {
    color: "#047857",
    fontSize: 14,
    fontWeight: "800",
  },
  activePillText: {
    color: "#FFFFFF",
  },
  analyzeButton: {
    minHeight: 62,
    borderRadius: 26,
    backgroundColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 34,
    shadowColor: "#10B981",
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  analyzeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  analyzeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  viewAllText: {
    fontSize: 13,
    color: "#10B981",
    fontWeight: "900",
  },
  recentList: {
    gap: 14,
  },
  recentItem: {
    minHeight: 76,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  recentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 5,
  },
  recentCalories: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "700",
  },
  emptyRecent: {
    minHeight: 70,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "700",
  },
});