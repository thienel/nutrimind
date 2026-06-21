import React, { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Check } from "lucide-react-native";

import { OfflineBanner } from "@/components/OfflineBanner";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import { insertMeal, MealType } from "@/lib/repositories/mealRepository";

const MEAL_TYPES: { label: string; value: MealType }[] = [
  { label: "Breakfast", value: "breakfast" },
  { label: "Lunch", value: "lunch" },
  { label: "Dinner", value: "dinner" },
  { label: "Snack", value: "snack" },
];

function toText(value: string | string[] | undefined, fallback: string) {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

/** Parse số dương từ input; rỗng/không hợp lệ → 0. */
function parseNum(value: string): number {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default function ManualMealScreen() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(toText(params.name, ""));
  const [calories, setCalories] = useState(toText(params.calories, ""));
  const [protein, setProtein] = useState(toText(params.protein, ""));
  const [carbs, setCarbs] = useState(toText(params.carbs, ""));
  const [fat, setFat] = useState(toText(params.fat, ""));
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    Keyboard.dismiss();

    if (!name.trim()) {
      showToast({
        type: "warning",
        title: "Missing name",
        message: "Please enter the meal name.",
      });
      return;
    }

    const kcal = parseNum(calories);
    if (kcal <= 0) {
      showToast({
        type: "warning",
        title: "Missing calories",
        message: "Calories must be greater than 0.",
      });
      return;
    }

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
        name: name.trim(),
        calories: kcal,
        proteinG: parseNum(protein),
        carbsG: parseNum(carbs),
        fatG: parseNum(fat),
        mealType,
        source: "manual",
        loggedAt: new Date().toISOString(),
      });

      showToast({
        type: "success",
        title: "Meal saved",
        message: `${name.trim()} has been added to your meal history.`,
      });

      router.replace("/meal-history");
    } catch (error) {
      console.error("[ManualMealScreen] save meal failed:", error);
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
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={21} color="#0F172A" />
          </Pressable>
          <Text style={styles.title}>Add Meal Manually</Text>
        </View>

        <Text style={styles.label}>Meal name</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="E.g. Grilled chicken salad"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <Text style={styles.label}>Calories (kcal)</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={calories}
            onChangeText={setCalories}
            placeholder="0"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.macroGrid}>
          <View style={styles.macroField}>
            <Text style={styles.label}>Protein (g)</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={protein}
                onChangeText={setProtein}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.macroField}>
            <Text style={styles.label}>Carbs (g)</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={carbs}
                onChangeText={setCarbs}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.macroField}>
            <Text style={styles.label}>Fat (g)</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={fat}
                onChangeText={setFat}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <Text style={styles.label}>Meal type</Text>
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
          onPress={handleSave}
        >
          <View style={styles.saveIcon}>
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
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
    fontSize: 22,
    fontWeight: "900",
    color: "#071426",
  },
  label: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "700",
    marginBottom: 8,
  },
  inputWrap: {
    height: 56,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    justifyContent: "center",
    marginBottom: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  input: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700",
  },
  macroGrid: {
    flexDirection: "row",
    gap: 12,
  },
  macroField: {
    flex: 1,
  },
  mealTypeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 30,
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
