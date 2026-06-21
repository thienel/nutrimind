import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import * as ImagePicker from "expo-image-picker";
import {
  ArrowLeft,
  Camera,
  Clock3,
  Plus,
  Search,
  Sparkles,
} from "lucide-react-native";

import { OfflineBanner } from "@/components/OfflineBanner";
import { useToast } from "@/components/ToastProvider";
import { useNetwork } from "@/context/NetworkContext";
import { useAuth } from "@/context/AuthContext";
import {
  getMealHistory,
  MealEntry,
} from "@/lib/repositories/mealRepository";
import { analyzeMealPhoto } from "@/services/mealAiService";

/** Preset nhập nhanh (dữ liệu local, không phải AI) — user xác nhận trước khi lưu. */
type MealPreset = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const SUGGESTIONS: MealPreset[] = [
  { name: "1 bowl of pho", calories: 520, protein: 26, carbs: 64, fat: 16 },
  { name: "Grilled chicken + rice", calories: 610, protein: 42, carbs: 72, fat: 14 },
  { name: "2 eggs + bread", calories: 380, protein: 22, carbs: 35, fat: 16 },
  { name: "Beef steak + salad", calories: 670, protein: 48, carbs: 24, fat: 34 },
  { name: "Banana smoothie", calories: 310, protein: 9, carbs: 58, fat: 6 },
  { name: "Chicken soup", calories: 420, protein: 31, carbs: 38, fat: 12 },
];

export default function MealLogScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isOnline } = useNetwork();

  const userId = user ? Number(user.id) : 1;

  const [mealText, setMealText] = useState("");
  const [recentMeals, setRecentMeals] = useState<MealEntry[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

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
        if (mounted) setRecentMeals(meals);
      } catch (error) {
        console.error("[MealLogScreen] load recent meals failed:", error);
      }
    }

    loadRecentMeals();
    return () => {
      mounted = false;
    };
  }, [userId]);

  // ── Manual entry (Describe your meal) ──────────────────────────────────────
  function goToManualEntry(preset?: MealPreset, name?: string) {
    router.push({
      pathname: "/manual-meal",
      params: {
        name: name ?? preset?.name ?? "",
        calories: preset ? String(preset.calories) : "",
        protein: preset ? String(preset.protein) : "",
        carbs: preset ? String(preset.carbs) : "",
        fat: preset ? String(preset.fat) : "",
      },
    });
  }

  function handleManualAdd() {
    Keyboard.dismiss();
    if (!trimmedMealText) {
      showToast({
        type: "warning",
        title: "Missing meal",
        message: "Please describe your meal first.",
      });
      return;
    }
    goToManualEntry(selectedSuggestion, trimmedMealText);
  }

  // ── AI Scan (camera + gallery) ─────────────────────────────────────────────
  async function runAnalysis(uri: string, fileSize?: number) {
    setAnalyzing(true);
    try {
      const result = await analyzeMealPhoto(
        uri,
        trimmedMealText || undefined,
        fileSize
      );
      router.push({
        pathname: "/ai-result",
        params: {
          name: result.food_name,
          calories: String(result.calories),
          protein: String(result.protein_g),
          carbs: String(result.carb_g),
          fat: String(result.fat_g),
          confidence: String(result.confidence),
          lowConfidence: result.low_confidence ? "1" : "0",
          disclaimer: result.disclaimer ?? "",
          imageUri: uri,
        },
      });
    } catch (error: any) {
      console.error("[MealLogScreen] AI analyze failed:", error);
      showToast({
        type: "error",
        title: "Analyze failed",
        message: error?.message ?? "Could not analyze the photo. Please try again.",
      });
    } finally {
      setAnalyzing(false);
    }
  }

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showToast({
        type: "warning",
        title: "Camera permission",
        message: "Please allow camera access to scan your meal.",
      });
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
    });
    if (!res.canceled && res.assets?.[0]) {
      await runAnalysis(res.assets[0].uri, res.assets[0].fileSize);
    }
  }

  async function pickFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast({
        type: "warning",
        title: "Photo permission",
        message: "Please allow photo library access to upload a meal photo.",
      });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
    });
    if (!res.canceled && res.assets?.[0]) {
      await runAnalysis(res.assets[0].uri, res.assets[0].fileSize);
    }
  }

  function handleScanWithAI() {
    Keyboard.dismiss();
    if (!isOnline) {
      showToast({
        type: "warning",
        title: "You're offline",
        message: "AI scan needs an internet connection.",
      });
      return;
    }
    Alert.alert("Scan meal with AI", "Choose a photo source", [
      { text: "Take Photo", onPress: pickFromCamera },
      { text: "Choose from Library", onPress: pickFromLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function handleRecentMealPress(meal: MealEntry) {
    // Re-log nhanh: mở form nhập tay với dữ liệu cũ điền sẵn.
    goToManualEntry(
      {
        name: meal.name,
        calories: meal.calories,
        protein: meal.protein_g,
        carbs: meal.carbs_g,
        fat: meal.fat_g,
      },
      meal.name
    );
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

        <Pressable
          style={styles.aiCard}
          onPress={handleScanWithAI}
          disabled={analyzing}
        >
          <View style={styles.aiTextWrap}>
            <View style={styles.aiLabelRow}>
              <Sparkles size={15} color="#FFFFFF" />
              <Text style={styles.aiLabel}>AI Nutrition Scan</Text>
            </View>

            <Text style={styles.aiTitle}>Scan meal{"\n"}with AI</Text>
            <Text style={styles.aiSubtitle}>
              Take or upload a photo to estimate calories & macros.
            </Text>
          </View>

          <View style={styles.cameraButton}>
            {analyzing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Camera size={28} color="#FFFFFF" />
            )}
          </View>
        </Pressable>

        {analyzing && (
          <View style={styles.analyzingRow}>
            <ActivityIndicator size="small" color="#10B981" />
            <Text style={styles.analyzingText}>Analyzing your meal photo…</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>Describe your meal</Text>

        <View style={styles.inputWrap}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            style={styles.input}
            value={mealText}
            onChangeText={setMealText}
            placeholder="E.g. 1 bowl of pho"
            placeholderTextColor="#94A3B8"
            returnKeyType="done"
            onSubmitEditing={handleManualAdd}
          />
        </View>

        <Text style={[styles.sectionLabel, styles.suggestionTitle]}>
          Quick add
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

        <Pressable style={styles.analyzeButton} onPress={handleManualAdd}>
          <View style={styles.analyzeIcon}>
            <Plus size={17} color="#FFFFFF" />
          </View>
          <Text style={styles.analyzeText}>Add Manually</Text>
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
  analyzingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  analyzingText: {
    color: "#10B981",
    fontSize: 14,
    fontWeight: "700",
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
