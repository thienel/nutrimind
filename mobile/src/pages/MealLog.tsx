/**
 * MealLog screen — log bữa ăn (offline-first)
 *
 * Hoạt động hoàn toàn offline: ghi vào SQLite, enqueue sync.
 */

import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import {
  ArrowLeft,
  Coffee,
  Pizza,
  Sun,
  Moon,
  Apple,
  Check,
} from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { useMealLog } from "@/hooks/useMealLog";
import { OfflineBanner } from "@/components/OfflineBanner";
import { MealType } from "@/lib/repositories/mealRepository";
import { useCallback } from "react";

const MEAL_TYPES: { key: MealType; label: string; icon: React.ReactNode }[] = [
  { key: "breakfast", label: "Sáng", icon: <Sun size={18} color="#F59E0B" /> },
  { key: "lunch", label: "Trưa", icon: <Pizza size={18} color="#10B981" /> },
  { key: "dinner", label: "Tối", icon: <Moon size={18} color="#6366F1" /> },
  { key: "snack", label: "Snack", icon: <Apple size={18} color="#EF4444" /> },
  { key: "other", label: "Khác", icon: <Coffee size={18} color="#64748B" /> },
];

export function MealLog() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const { meals, macros, logMeal, removeMeal, isLoading } = useMealLog(
    user?.id ?? null,
    today
  );

  // Form state
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [mealType, setMealType] = useState<MealType>("other");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert("Thiếu tên", "Vui lòng nhập tên món ăn");
      return;
    }
    const cal = parseFloat(calories) || 0;

    setSaving(true);
    const id = await logMeal({
      name: name.trim(),
      calories: cal,
      proteinG: parseFloat(protein) || 0,
      carbsG: parseFloat(carbs) || 0,
      fatG: parseFloat(fat) || 0,
      mealType,
    });
    setSaving(false);

    if (id) resetForm();
  };

  const handleDelete = (id: string, mealName: string) => {
    Alert.alert("Xóa bữa ăn", `Xóa "${mealName}"?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => removeMeal(id),
      },
    ]);
  };

  const todayFormatted = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <OfflineBanner pushContent />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={22} color="#0F172A" />
            </Pressable>
            <View>
              <Text style={styles.title}>Log Bữa Ăn</Text>
              <Text style={styles.subtitle}>{todayFormatted}</Text>
            </View>
          </View>

          {/* Daily Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Tổng hôm nay</Text>
            <View style={styles.macroRow}>
              <MacroChip
                label="Calories"
                value={Math.round(macros.calories)}
                unit="kcal"
                color="#F59E0B"
              />
              <MacroChip
                label="Protein"
                value={Math.round(macros.protein)}
                unit="g"
                color="#10B981"
              />
              <MacroChip
                label="Carbs"
                value={Math.round(macros.carbs)}
                unit="g"
                color="#6366F1"
              />
              <MacroChip
                label="Fat"
                value={Math.round(macros.fat)}
                unit="g"
                color="#EF4444"
              />
            </View>
          </View>

          {/* Add Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Thêm món ăn</Text>

            {/* Meal type selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.typeScroll}
            >
              {MEAL_TYPES.map((t) => (
                <Pressable
                  key={t.key}
                  style={[
                    styles.typeChip,
                    mealType === t.key && styles.typeChipActive,
                  ]}
                  onPress={() => setMealType(t.key)}
                >
                  {t.icon}
                  <Text
                    style={[
                      styles.typeLabel,
                      mealType === t.key && styles.typeLabelActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <TextInput
              style={styles.input}
              placeholder="Tên món ăn *"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
            />

            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholder="Calories (kcal)"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
                value={calories}
                onChangeText={setCalories}
              />
            </View>

            <View style={styles.macroInputRow}>
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholder="Protein (g)"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
                value={protein}
                onChangeText={setProtein}
              />
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholder="Carbs (g)"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
                value={carbs}
                onChangeText={setCarbs}
              />
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholder="Fat (g)"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
                value={fat}
                onChangeText={setFat}
              />
            </View>

            <Pressable
              style={[styles.addBtn, saving && styles.addBtnDisabled]}
              onPress={handleAdd}
              disabled={saving}
            >
              <Check size={18} color="#fff" />
              <Text style={styles.addBtnText}>
                {saving ? "Đang lưu..." : "Thêm vào nhật ký"}
              </Text>
            </Pressable>
          </View>

          {/* Meal List */}
          {meals.length > 0 && (
            <View style={styles.listCard}>
              <Text style={styles.listTitle}>Bữa ăn hôm nay</Text>
              {meals.map((meal) => (
                <MealItem
                  key={meal.id}
                  name={meal.name}
                  calories={meal.calories}
                  mealType={meal.meal_type as MealType}
                  protein={meal.protein_g}
                  carbs={meal.carbs_g}
                  fat={meal.fat_g}
                  onDelete={() => handleDelete(meal.id, meal.name)}
                />
              ))}
            </View>
          )}

          {meals.length === 0 && !isLoading && (
            <View style={styles.emptyState}>
              <Pizza size={40} color="#CBD5E1" />
              <Text style={styles.emptyText}>Chưa có bữa ăn nào hôm nay</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MacroChip({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <View style={styles.macroChip}>
      <Text style={[styles.macroValue, { color }]}>{value}</Text>
      <Text style={styles.macroUnit}>{unit}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const MEAL_TYPE_ICONS: Record<MealType, React.ReactNode> = {
  breakfast: <Sun size={15} color="#F59E0B" />,
  lunch: <Pizza size={15} color="#10B981" />,
  dinner: <Moon size={15} color="#6366F1" />,
  snack: <Apple size={15} color="#EF4444" />,
  other: <Coffee size={15} color="#64748B" />,
};

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Sáng",
  lunch: "Trưa",
  dinner: "Tối",
  snack: "Snack",
  other: "Khác",
};

function MealItem({
  name,
  calories,
  mealType,
  protein,
  carbs,
  fat,
  onDelete,
}: {
  name: string;
  calories: number;
  mealType: MealType;
  protein: number;
  carbs: number;
  fat: number;
  onDelete: () => void;
}) {
  return (
    <View style={styles.mealItem}>
      <View style={styles.mealLeft}>
        <View style={styles.mealIconWrap}>
          {MEAL_TYPE_ICONS[mealType]}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.mealName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.mealMacro}>
            {MEAL_TYPE_LABELS[mealType]} · P {Math.round(protein)}g · C{" "}
            {Math.round(carbs)}g · F {Math.round(fat)}g
          </Text>
        </View>
      </View>
      <View style={styles.mealRight}>
        <Text style={styles.mealCal}>{Math.round(calories)}</Text>
        <Text style={styles.mealCalUnit}>kcal</Text>
        <Pressable onPress={onDelete} style={styles.deleteBtn} hitSlop={8}>
          <Text style={styles.deleteText}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9F8" },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: 12,
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 13, color: "#64748B", marginTop: 2 },

  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTitle: { fontSize: 13, color: "#94A3B8", marginBottom: 12 },
  macroRow: { flexDirection: "row", justifyContent: "space-around" },
  macroChip: { alignItems: "center", gap: 2 },
  macroValue: { fontSize: 22, fontWeight: "800" },
  macroUnit: { fontSize: 11, color: "#94A3B8" },
  macroLabel: { fontSize: 11, color: "#64748B" },

  formCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 14,
  },
  typeScroll: { marginBottom: 14 },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginRight: 8,
  },
  typeChipActive: {
    borderColor: "#10B981",
    backgroundColor: "#ECFDF5",
  },
  typeLabel: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  typeLabelActive: { color: "#10B981" },

  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  row: { flexDirection: "row", gap: 10 },
  macroInputRow: { flexDirection: "row", gap: 8 },
  flex1: { flex: 1 },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10B981",
    borderRadius: 14,
    height: 50,
    marginTop: 4,
  },
  addBtnDisabled: { backgroundColor: "#A7F3D0" },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  listCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },

  mealItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  mealLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  mealIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  mealName: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  mealMacro: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  mealRight: { alignItems: "flex-end", gap: 2 },
  mealCal: { fontSize: 16, fontWeight: "700", color: "#F59E0B" },
  mealCalUnit: { fontSize: 10, color: "#94A3B8" },
  deleteBtn: { marginTop: 4 },
  deleteText: { color: "#CBD5E1", fontSize: 13 },

  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: { color: "#94A3B8", fontSize: 14 },
});
