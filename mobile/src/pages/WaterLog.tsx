/**
 * WaterLog screen — log nước uống (offline-first, redesigned to match mockups)
 */

import React, { useState, useEffect } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Switch,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, Droplets, Plus, Minus, Trash2, Bell } from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";
import { useAuth } from "@/context/AuthContext";
import { useWaterLog } from "@/hooks/useWaterLog";
import { useOfflineProfile } from "@/hooks/useOfflineProfile";
import { OfflineBanner } from "@/components/OfflineBanner";
import { api } from "@/lib/apiClient";
import { useToast } from "@/components/ToastProvider";

// Quick add amounts in ml
const QUICK_AMOUNTS = [100, 200, 300, 500];

export function WaterLog() {
  const { user } = useAuth();
  const { profile } = useOfflineProfile();
  const { showToast } = useToast();
  const today = new Date().toLocaleDateString('en-CA');
  const { logs, totalMl, addWater, removeWater, isLoading } = useWaterLog(
    user?.id ? Number(user.id) : null,
    today
  );

  const [customAmount, setCustomAmount] = useState("250");
  const [saving, setSaving] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);

  const getParsedAmount = (val: string): number => {
    const amount = parseFloat(val.replace(",", "."));
    if (isNaN(amount) || amount <= 0) return 0;
    // Heuristic: If <= 10, treat as Liters -> convert to ml
    return amount <= 10 ? Math.round(amount * 1000) : Math.round(amount);
  };

  // Dynamic Goal calculation
  const parsedWeight = profile?.weight ? parseFloat(profile.weight) : 62;
  const weight = isNaN(parsedWeight) || parsedWeight <= 0 ? 62 : parsedWeight;
  const calculatedGoal = profile?.waterTargetMl || Math.round(weight * 35);
  const dailyGoalMl = isNaN(calculatedGoal) || calculatedGoal <= 0 ? 2000 : calculatedGoal;
  
  // Progress calculations
  const rawProgressPct = dailyGoalMl > 0 ? Math.min((totalMl / dailyGoalMl) * 100, 100) : 0;
  const progressPct = isNaN(rawProgressPct) ? 0 : rawProgressPct;
  const size = 180;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const rawStrokeDashoffset = circumference - (progressPct / 100) * circumference;
  const strokeDashoffset = isNaN(rawStrokeDashoffset) ? circumference : rawStrokeDashoffset;

  // Load reminder settings from server
  useEffect(() => {
    let active = true;
    const loadReminders = async () => {
      try {
        const res = await api.get<{ reminders: any[] }>("/reminders");
        if (active && res && Array.isArray(res.reminders)) {
          const waterReminder = res.reminders.find((r) => r.reminder_type === "water");
          if (waterReminder) {
            setReminderEnabled(waterReminder.enabled);
          }
        }
      } catch (err) {
        console.log("Failed to load reminders:", err);
      }
    };

    loadReminders();
    return () => {
      active = false;
    };
  }, []);

  const handleAdd = async (amountMl: number) => {
    if (!amountMl || amountMl <= 0) return;
    setSaving(true);
    const id = await addWater(amountMl);
    setSaving(false);
    if (id) {
      showToast({
        type: "success",
        title: "Thành công",
        message: `Đã thêm ${amountMl} ml nước uống.`,
      });
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Xóa mục này?", "Bạn có chắc chắn muốn xóa lần uống nước này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          await removeWater(id);
          showToast({
            type: "success",
            title: "Đã xóa",
            message: "Đã xóa bản ghi uống nước thành công.",
          });
        },
      },
    ]);
  };

  const handleReminderToggle = async (value: boolean) => {
    setReminderEnabled(value);
    try {
      await api.put("/reminders/water", {
        enabled: value,
        frequency_min: 120,
        window_start: "08:00",
        window_end: "22:00",
      });
    } catch (err) {
      console.log("Failed to toggle water reminder:", err);
      // rollback state on error
      setReminderEnabled(!value);
      Alert.alert("Lỗi", "Không thể cập nhật cấu hình nhắc nhở.");
    }
  };

  const todayFormatted = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const isHydrated = totalMl >= dailyGoalMl;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <OfflineBanner pushContent />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#0F172A" />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>Water Intake</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Circular Droplets Badge */}
        <View style={styles.badgeSection}>
          <View style={styles.waterIconWrap}>
            <Droplets size={36} color="#0EA5E9" />
          </View>
          <Text style={styles.statusTitle}>
            {isHydrated ? "Great Job!" : "Keep Going!"}
          </Text>
          <Text style={styles.statusSubtitle}>
            {isHydrated ? "You're hydrated today 💙" : "Stay hydrated to keep healthy 💧"}
          </Text>
        </View>

        {/* Progress Circular Card */}
        <View style={styles.progressCircleContainer}>
          <Svg width={size} height={size}>
            {/* Background ring */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#E2E8F0"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Active progress ring */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#0EA5E9"
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
            />
          </Svg>
          <View style={styles.progressTextContainer}>
            <Text style={styles.totalText}>
              {(totalMl / 1000).toFixed(1)}
              <Text style={styles.totalUnit}>L</Text>
            </Text>
            <Text style={styles.goalText}>
              / {(dailyGoalMl / 1000).toFixed(1)}L
            </Text>
          </View>
        </View>

        {/* Goal formula */}
        <Text style={styles.formulaText}>
          Goal: 35ml × {weight}kg = {(dailyGoalMl / 1000).toFixed(1)}L
        </Text>

        {/* Quick add section */}
        <View style={styles.quickRow}>
          {QUICK_AMOUNTS.map((ml) => (
            <Pressable
              key={ml}
              style={styles.quickCard}
              onPress={() => handleAdd(ml)}
              disabled={saving}
            >
              <Droplets size={16} color="#0EA5E9" style={styles.quickCardIcon} />
              <Text style={styles.quickCardAmount}>+{ml}</Text>
              <Text style={styles.quickCardUnit}>ml</Text>
            </Pressable>
          ))}
        </View>

        {/* Custom amount */}
        {!showCustomInput ? (
          <Pressable
            style={styles.customBtn}
            onPress={() => setShowCustomInput(true)}
          >
            <Text style={styles.customBtnText}>Custom Amount</Text>
          </Pressable>
        ) : (
          <View style={styles.customSection}>
            <View style={styles.customInputRow}>
              <Pressable
                style={styles.stepBtn}
                onPress={() =>
                  setCustomAmount((v) =>
                    String(Math.max(50, (parseInt(v) || 250) - 50))
                  )
                }
              >
                <Minus size={18} color="#0EA5E9" />
              </Pressable>
              <View style={styles.customInputWrap}>
                <TextInput
                  style={styles.customInput}
                  keyboardType="numeric"
                  value={customAmount}
                  onChangeText={setCustomAmount}
                  placeholder="250"
                />
                <Text style={styles.customUnit}>ml/L</Text>
              </View>
              <Pressable
                style={styles.stepBtn}
                onPress={() =>
                  setCustomAmount((v) =>
                    String(Math.min(5000, (parseInt(v) || 250) + 50))
                  )
                }
              >
                <Plus size={18} color="#0EA5E9" />
              </Pressable>
            </View>

            {customAmount.trim() !== "" && getParsedAmount(customAmount) > 0 && (
              <Text style={styles.customPreviewText}>
                Sẽ thêm: {getParsedAmount(customAmount)} ml ({(getParsedAmount(customAmount) / 1000).toFixed(2)}L)
              </Text>
            )}

            <View style={styles.customActions}>
              <Pressable
                style={[styles.customSaveBtn, saving && styles.customBtnDisabled]}
                onPress={() => {
                  handleAdd(getParsedAmount(customAmount) || 250);
                  setShowCustomInput(false);
                }}
                disabled={saving}
              >
                <Text style={styles.customSaveText}>Thêm</Text>
              </Pressable>
              <Pressable
                style={styles.customCancelBtn}
                onPress={() => setShowCustomInput(false)}
              >
                <Text style={styles.customCancelText}>Hủy</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Reminder Card */}
        <View style={styles.reminderCard}>
          <View style={styles.bellIconWrap}>
            <Bell size={22} color="#10B981" />
          </View>
          <View style={styles.reminderInfo}>
            <Text style={styles.reminderTitle}>Smart Reminder</Text>
            <Text style={styles.reminderSubtitle}>
              {reminderEnabled ? "Remind me every 2 hours" : "Reminders turned off"}
            </Text>
          </View>
          <Switch
            value={reminderEnabled}
            onValueChange={handleReminderToggle}
            trackColor={{ false: "#E2E8F0", true: "#34D399" }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Log History */}
        {logs.length > 0 && (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>Lịch sử hôm nay</Text>
            {logs.map((log) => {
              const time = new Date(log.logged_at).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <View key={log.id} style={styles.logItem}>
                  <View style={styles.logLeft}>
                    <View style={styles.logDot} />
                    <View>
                      <Text style={styles.logAmount}>
                        {log.amount_ml}
                        <Text style={styles.logUnit}> ml</Text>
                      </Text>
                      <Text style={styles.logTime}>{time}</Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => handleDelete(log.id)}
                    hitSlop={8}
                    style={styles.deleteBtn}
                  >
                    <Trash2 size={16} color="#FDA4AF" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {logs.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Droplets size={32} color="#CBD5E1" />
            <Text style={styles.emptyText}>Chưa ghi nhận lượng nước hôm nay</Text>
          </View>
        )}

        {isLoading && (
          <View style={{ marginTop: 20 }}>
            <ActivityIndicator size="small" color="#0EA5E9" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4FAF8" },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
  placeholder: { width: 44 },

  badgeSection: {
    alignItems: "center",
    marginVertical: 12,
  },
  waterIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  statusSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
    fontWeight: "500",
  },

  progressCircleContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
    position: "relative",
  },
  progressTextContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  totalText: {
    fontSize: 36,
    fontWeight: "800",
    color: "#1E293B",
  },
  totalUnit: { fontSize: 22, color: "#1E293B" },
  goalText: { color: "#0EA5E9", fontSize: 14, fontWeight: "700", marginTop: 2 },

  formulaText: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 24,
  },

  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  quickCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  quickCardIcon: {
    marginBottom: 6,
  },
  quickCardAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  quickCardUnit: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 1,
  },

  customBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0EA5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    shadowColor: "#0EA5E9",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  customBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  customSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  customInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  customInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
  },
  customInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    padding: 0,
  },
  customUnit: { color: "#94A3B8", fontSize: 13, fontWeight: "600" },
  customPreviewText: {
    fontSize: 13,
    color: "#0284C7",
    fontWeight: "700",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 2,
  },
  customActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  customSaveBtn: {
    flex: 2,
    backgroundColor: "#0EA5E9",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  customBtnDisabled: { backgroundColor: "#BAE6FD" },
  customSaveText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  customCancelBtn: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  customCancelText: { color: "#475569", fontWeight: "700", fontSize: 14 },

  reminderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  bellIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8FBF2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
  },
  reminderSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },

  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  logItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  logLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#38BDF8",
  },
  logAmount: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  logUnit: { fontSize: 12, color: "#64748B", fontWeight: "500" },
  logTime: { fontSize: 11, color: "#94A3B8", marginTop: 2, fontWeight: "500" },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#FFF1F2",
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: { color: "#94A3B8", fontSize: 13, fontWeight: "500" },
});
