import React, { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Edit3,
  Sparkles,
} from "lucide-react-native";

import { OfflineBanner } from "@/components/OfflineBanner";
import { OfflineEmptyState } from "@/components/OfflineEmptyState";
import { useNetwork } from "@/context/NetworkContext";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import {
  insertMeal,
  MealType,
} from "@/lib/repositories/mealRepository";

type MacroKey = "protein" | "carbs" | "fat";

const MEAL_TYPES: { label: string; value: MealType }[] = [
  { label: "Breakfast", value: "breakfast" },
  { label: "Lunch", value: "lunch" },
  { label: "Dinner", value: "dinner" },
  { label: "Snack", value: "snack" },
];

function toNumber(value: string | string[] | undefined, fallback: number) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function toText(value: string | string[] | undefined, fallback: string) {
  if (Array.isArray(value)) return value[0] ?? fallback;

  return value ?? fallback;
}

export default function AIResultScreen() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isOnline } = useNetwork();

  const [mealType, setMealType] = useState<MealType>("lunch");
  const [isSaving, setIsSaving] = useState(false);

  const result = useMemo(
    () => ({
      name: toText(params.name, "AI estimated meal"),
      calories: toNumber(params.calories, 670),
      protein: toNumber(params.protein, 28),
      carbs: toNumber(params.carbs, 72),
      fat: toNumber(params.fat, 18),
      fiber: toNumber(params.fiber, 3.2),
      sugar: toNumber(params.sugar, 20),
      sodium: toNumber(params.sodium, 890),
      potassium: toNumber(params.potassium, 540),
    }),
    [params]
  );

  async function handleSaveMeal() {
    if (!user) {
      showToast({
        type: "error",
        title: "Login required",
        message: "Please login again before saving your meal.",
      });
      router.replace("/auth");
      return;
    }

    try {
      setIsSaving(true);

      await insertMeal({
        userId: Number(user.id),
        name: result.name,
        calories: result.calories,
        proteinG: result.protein,
        carbsG: result.carbs,
        fatG: result.fat,
        mealType,
        loggedAt: new Date().toISOString(),
      });

      showToast({
        type: "success",
        title: "Meal saved",
        message: `${result.name} has been added to your meal history.`,
      });

      router.replace("/meal-history");
    } catch (error) {
      console.error("[AIResultScreen] save meal failed:", error);

      showToast({
        type: "error",
        title: "Save failed",
        message: "Could not save this meal. Please try again.",
      });
    } finally {
      setIsSaving(false);
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
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={21} color="#0F172A" />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>AI Analysis Result ✨</Text>
            <Text style={styles.subtitle}>Nutrition estimated by NutriMind AI</Text>
          </View>
        </View>

        <View style={styles.warningCard}>
          <View style={styles.warningIcon}>
            <AlertTriangle size={17} color="#F59E0B" />
          </View>

          <View style={styles.warningTextWrap}>
            <Text style={styles.warningTitle}>AI Estimate</Text>
            <Text style={styles.warningText}>
              Nutrition values are estimated by AI. Please verify before saving.
            </Text>
          </View>
        </View>

        <Image
          source={{
            uri: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&auto=format&fit=crop",
          }}
          style={styles.foodImage}
        />

        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalLabel}>Total Nutrition</Text>
            <View style={styles.calorieRow}>
              <Text style={styles.calories}>{Math.round(result.calories)}</Text>
              <Text style={styles.kcal}>kcal</Text>
            </View>
          </View>

          <View style={styles.goodChoicePill}>
            <Text style={styles.goodChoiceText}>Good choice</Text>
          </View>
        </View>

        <Pressable
          style={styles.editButton}
          onPress={() =>
            showToast({
              type: "info",
              title: "Edit result",
              message: "Manual editing will be connected later.",
            })
          }
        >
          <Edit3 size={15} color="#0F172A" />
          <Text style={styles.editText}>Edit Result</Text>
        </Pressable>

        <View style={styles.macroRow}>
          <MacroCard type="protein" label="Protein" value={result.protein} />
          <MacroCard type="carbs" label="Carbs" value={result.carbs} />
          <MacroCard type="fat" label="Fat" value={result.fat} />
        </View>

        <Text style={styles.saveLabel}>Save to meal</Text>

        <View style={styles.mealTypeRow}>
          {MEAL_TYPES.map((item) => {
            const active = mealType === item.value;

            return (
              <Pressable
                key={item.value}
                style={[styles.mealTypePill, active && styles.activeMealType]}
                onPress={() => setMealType(item.value)}
              >
                <Text
                  style={[
                    styles.mealTypeText,
                    active && styles.activeMealTypeText,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Nutrient Breakdown</Text>

          <BreakdownRow label="Fiber" value={`${result.fiber}g`} />
          <BreakdownRow label="Sugar" value={`${result.sugar}g`} />
          <BreakdownRow label="Sodium" value={`${result.sodium}mg`} />
          <BreakdownRow label="Potassium" value={`${result.potassium}mg`} />
        </View>

        <Pressable
          disabled={isSaving}
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSaveMeal}
        >
          <View style={styles.saveIcon}>
            {isSaving ? (
              <Sparkles size={17} color="#FFFFFF" />
            ) : (
              <Check size={17} color="#FFFFFF" />
            )}
          </View>

          <Text style={styles.saveText}>
            {isSaving ? "Saving..." : "Save Meal"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function MacroCard({
  type,
  label,
  value,
}: {
  type: MacroKey;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.macroCard}>
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={[styles.macroDot, styles[`${type}Dot`]]} />
      <Text style={[styles.macroValue, styles[`${type}Text`]]}>
        {Math.round(value)}g
      </Text>
    </View>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={styles.breakdownValue}>{value}</Text>
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
    marginBottom: 22,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 22,
    color: "#071426",
    fontWeight: "900",
  },

  subtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
    fontWeight: "600",
  },

  warningCard: {
    minHeight: 82,
    borderRadius: 22,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 16,
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },

  warningIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },

  warningTextWrap: {
    flex: 1,
  },

  warningTitle: {
    fontSize: 13,
    color: "#F97316",
    fontWeight: "900",
    marginBottom: 5,
  },

  warningText: {
    fontSize: 13,
    color: "#F97316",
    lineHeight: 19,
    fontWeight: "600",
  },

  foodImage: {
    width: "100%",
    height: 174,
    borderRadius: 24,
    marginBottom: 22,
    backgroundColor: "#E2E8F0",
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },

  totalLabel: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "700",
    marginBottom: 3,
  },

  calorieRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 7,
  },

  calories: {
    fontSize: 44,
    lineHeight: 49,
    color: "#071426",
    fontWeight: "900",
  },

  kcal: {
    fontSize: 17,
    color: "#334155",
    fontWeight: "800",
    paddingBottom: 8,
  },

  goodChoicePill: {
    minHeight: 34,
    paddingHorizontal: 18,
    borderRadius: 17,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    marginBottom: 8,
  },

  goodChoiceText: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "900",
  },

  editButton: {
    alignSelf: "flex-start",
    minHeight: 42,
    borderRadius: 21,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
    shadowColor: "#0F172A",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  editText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
  },

  macroRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 22,
  },

  macroCard: {
    flex: 1,
    minHeight: 132,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    padding: 14,
    justifyContent: "space-between",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  macroLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
  },

  macroDot: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  proteinDot: {
    backgroundColor: "#D1FAE5",
  },

  carbsDot: {
    backgroundColor: "#EDE9FE",
  },

  fatDot: {
    backgroundColor: "#FFEDD5",
  },

  macroValue: {
    fontSize: 22,
    fontWeight: "900",
  },

  proteinText: {
    color: "#10B981",
  },

  carbsText: {
    color: "#7C3AED",
  },

  fatText: {
    color: "#F97316",
  },

  saveLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "700",
    marginBottom: 12,
  },

  mealTypeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },

  mealTypePill: {
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 15,
    justifyContent: "center",
  },

  activeMealType: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },

  mealTypeText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800",
  },

  activeMealTypeText: {
    color: "#FFFFFF",
  },

  breakdownCard: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 20,
    marginBottom: 24,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  breakdownTitle: {
    color: "#071426",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 18,
  },

  breakdownRow: {
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  breakdownLabel: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "700",
  },

  breakdownValue: {
    color: "#071426",
    fontSize: 14,
    fontWeight: "900",
  },

  saveButton: {
    minHeight: 62,
    borderRadius: 26,
    backgroundColor: "#10CDBA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#10B981",
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  saveButtonDisabled: {
    opacity: 0.65,
  },

  saveIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  saveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
});