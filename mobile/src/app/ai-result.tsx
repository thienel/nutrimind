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
  Sparkles,
} from "lucide-react-native";

import { OfflineBanner } from "@/components/OfflineBanner";
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

  const [mealType, setMealType] = useState<MealType>("lunch");
  const [isSaving, setIsSaving] = useState(false);

  const result = useMemo(
    () => ({
      name: toText(params.name, "AI estimated meal"),
      calories: toNumber(params.calories, 0),
      protein: toNumber(params.protein, 0),
      carbs: toNumber(params.carbs, 0),
      fat: toNumber(params.fat, 0),
      confidence: toNumber(params.confidence, 0),
      lowConfidence: toText(params.lowConfidence, "0") === "1",
      disclaimer: toText(params.disclaimer, ""),
      imageUri: toText(params.imageUri, ""),
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
        source: "ai_photo",
        aiConfidence: result.confidence || undefined,
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

  const confidencePct = Math.round((result.confidence || 0) * 100);

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

        <View
          style={[
            styles.warningCard,
            result.lowConfidence && styles.warningCardDanger,
          ]}
        >
          <View style={styles.warningIcon}>
            <AlertTriangle size={17} color="#F59E0B" />
          </View>

          <View style={styles.warningTextWrap}>
            <Text style={styles.warningTitle}>
              AI Estimate{confidencePct > 0 ? ` · ${confidencePct}% confidence` : ""}
            </Text>
            <Text style={styles.warningText}>
              {result.disclaimer ||
                "Nutrition values are estimated by AI. Please verify before saving."}
            </Text>
          </View>
        </View>

        {result.imageUri ? (
          <Image source={{ uri: result.imageUri }} style={styles.foodImage} />
        ) : null}

        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalLabel}>Total Nutrition</Text>
            <View style={styles.calorieRow}>
              <Text style={styles.calories}>{Math.round(result.calories)}</Text>
              <Text style={styles.kcal}>kcal</Text>
            </View>
          </View>

          {!result.lowConfidence && confidencePct >= 70 ? (
            <View style={styles.goodChoicePill}>
              <Text style={styles.goodChoiceText}>High confidence</Text>
            </View>
          ) : result.lowConfidence ? (
            <View style={styles.lowPill}>
              <Text style={styles.lowPillText}>Low confidence</Text>
            </View>
          ) : null}
        </View>

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
  warningCardDanger: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
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
    marginBottom: 22,
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
  lowPill: {
    minHeight: 34,
    paddingHorizontal: 18,
    borderRadius: 17,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    marginBottom: 8,
  },
  lowPillText: {
    fontSize: 12,
    color: "#DC2626",
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
