/**
 * WeightLog screen — log cân nặng (redesigned, offline-first)
 */

import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  ChevronLeft,
  Scale,
  TrendingDown,
  TrendingUp,
  Minus,
  Trash2,
  Plus,
  X,
  Sparkles,
} from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { useWeightLog } from "@/hooks/useWeightLog";
import { useOfflineProfile } from "@/hooks/useOfflineProfile";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useToast } from "@/components/ToastProvider";

export function WeightLog() {
  const { user } = useAuth();
  const { profile } = useOfflineProfile();
  const { showToast } = useToast();
  
  // Fetch logs (limit 50)
  const { history, latestWeight, addWeight, removeWeight, isLoading, error } =
    useWeightLog(user?.id ? Number(user.id) : null, 50);

  const [modalVisible, setModalVisible] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Safe history array casting
  const historyList = Array.isArray(history) ? history : [];

  // Calculations
  const rawStartW = (historyList && historyList.length > 0 && historyList[historyList.length - 1]) 
    ? historyList[historyList.length - 1].weight_kg 
    : (Number(profile?.weight) || 70);
  const startW = isNaN(rawStartW) || rawStartW <= 0 ? 70 : rawStartW;
  
  const rawCurrentW = latestWeight || startW;
  const currentW = isNaN(rawCurrentW) || rawCurrentW <= 0 ? 70 : rawCurrentW;

  const rawGoalW = Number(profile?.goalWeight) || 65;
  const goalW = isNaN(rawGoalW) || rawGoalW <= 0 ? 65 : rawGoalW;

  const diff = isNaN(currentW - startW) ? 0 : currentW - startW;
  const progressText = diff === 0 ? "0 kg" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)} kg`;

  const remaining = isNaN(currentW - goalW) ? 0 : Math.max(0, currentW - goalW);
  const totalToLose = isNaN(startW - goalW) ? 0 : startW - goalW;
  const totalToGain = isNaN(goalW - startW) ? 0 : goalW - startW;
  
  let rawProgressPct = 0;
  if (totalToLose > 0) {
    rawProgressPct = Math.min(100, Math.max(0, ((startW - currentW) / totalToLose) * 100));
  } else if (totalToGain > 0) {
    rawProgressPct = Math.min(100, Math.max(0, ((currentW - startW) / totalToGain) * 100));
  }
  const progressPct = isNaN(rawProgressPct) ? 0 : rawProgressPct;

  // Trend status
  const isLossGoal = goalW <= startW;
  let statusText = "Consistent";
  let statusColor = "#64748B";
  let statusBg = "#F1F5F9";
  let trendIcon = <Minus size={16} color="#64748B" />;

  if (diff < 0) {
    statusText = isLossGoal ? "Improving" : "Consistent";
    statusColor = "#10B981";
    statusBg = "#ECFDF5";
    trendIcon = <TrendingDown size={16} color="#10B981" />;
  } else if (diff > 0) {
    statusText = isLossGoal ? "Gaining Weight" : "Improving";
    statusColor = isLossGoal ? "#EF4444" : "#10B981";
    statusBg = isLossGoal ? "#FFF1F2" : "#ECFDF5";
    trendIcon = <TrendingUp size={16} color={statusColor} />;
  }

  // Generate 5 bars for the Weight Trend
  const chartItems = [...historyList].slice(0, 5).reverse();
  while (chartItems.length < 5) {
    // Pad chart data with starting/fallback weight so it doesn't look empty
    const offset = chartItems.length - 2; // small mock deviations
    chartItems.unshift({
      id: `mock-${chartItems.length}`,
      user_id: 0,
      weight_kg: startW + (offset * 0.4),
      note: null,
      logged_at: new Date(Date.now() - (5 - chartItems.length) * 24 * 60 * 60 * 1000).toISOString(),
      created_at: "",
      is_deleted: 0,
      server_id: null,
    });
  }

  const chartWeights = chartItems.map((d) => d.weight_kg);
  const maxW = Math.max(...chartWeights, currentW, startW, goalW);
  const minW = Math.min(...chartWeights, currentW, startW, goalW);
  const rangeW = maxW - minW || 1;

  const handleAddWeightLog = async () => {
    const w = parseFloat(weightInput.replace(",", "."));
    if (isNaN(w) || w < 20 || w > 500) {
      Alert.alert("Giá trị không hợp lệ", "Vui lòng nhập cân nặng hợp lệ (20-500 kg)");
      return;
    }
    setSaving(true);
    const id = await addWeight(w, noteInput.trim() || undefined);
    setSaving(false);
    if (id) {
      showToast({
        type: "success",
        title: "Thành công",
        message: `Đã cập nhật cân nặng mới: ${w.toFixed(1)} kg.`,
      });
      setWeightInput("");
      setNoteInput("");
      setModalVisible(false);
    }
  };

  const handleDeleteWeightLog = (id: string) => {
    Alert.alert("Xóa mục này?", "Bạn có chắc chắn muốn xóa lần ghi nhận cân nặng này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          await removeWeight(id);
          showToast({
            type: "success",
            title: "Đã xóa",
            message: "Đã xóa bản ghi cân nặng thành công.",
          });
        },
      },
    ]);
  };

  const formatDate = (isoString: string) => {
    try {
      if (!isoString) return "N/A";
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "N/A";
      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];
      const m = months[d.getMonth()];
      if (!m) return "N/A";
      return `${m} ${d.getDate()}`;
    } catch {
      return "N/A";
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <OfflineBanner pushContent />

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={22} color="#0F172A" />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>Weight Tracking</Text>
            <Text style={styles.subtitle}>Track your progress ⚖️</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Side-by-side Cards */}
        <View style={styles.statsRow}>
          {/* Card Current */}
          <View style={styles.statCard}>
            <View style={[styles.iconWrap, { backgroundColor: "#ECFEFF" }]}>
              <Scale size={20} color="#0891B2" />
            </View>
            <Text style={styles.statLabel}>Current</Text>
            <Text style={styles.statValue}>
              {currentW.toFixed(1)}
              <Text style={styles.statUnit}> kg</Text>
            </Text>
          </View>

          {/* Card Progress */}
          <View style={styles.statCard}>
            <View style={[styles.iconWrap, { backgroundColor: diff <= 0 ? "#ECFDF5" : "#FFF1F2" }]}>
              {diff <= 0 ? (
                <TrendingDown size={20} color="#059669" />
              ) : (
                <TrendingUp size={20} color="#E11D48" />
              )}
            </View>
            <Text style={styles.statLabel}>Progress</Text>
            <Text style={styles.statValue}>{progressText}</Text>
          </View>
        </View>

        {/* Goal Weight Info Card */}
        <View style={styles.goalCard}>
          <View style={styles.goalRow}>
            <View>
              <Text style={styles.goalLabel}>Goal Weight</Text>
              <Text style={styles.goalValue}>{goalW} kg</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.goalLabel}>Remaining</Text>
              <Text style={[styles.goalValue, { color: remaining > 0 ? "#10B981" : "#059669" }]}>
                {remaining > 0 ? `${remaining.toFixed(1)} kg` : "Completed! 🎉"}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
          </View>
        </View>

        {/* Weight Trend (Bar Chart) */}
        <View style={styles.trendCard}>
          <View style={styles.trendHeader}>
            <Text style={styles.trendTitle}>Weight Trend</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              {trendIcon}
              <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
            </View>
          </View>

          <View style={styles.chartContainer}>
            {chartItems.map((d, i) => {
              // Map height between 20% and 100%
              const rawHeightPct = rangeW > 0 ? ((d.weight_kg - minW) / rangeW) * 70 + 20 : 60;
              const heightPct = isNaN(rawHeightPct) ? 60 : rawHeightPct;
              return (
                <View key={d.id} style={styles.chartColumn}>
                  <View style={styles.chartBarContainer}>
                    <View style={[styles.chartBar, { height: `${heightPct}%` }]} />
                  </View>
                  <Text style={styles.chartLabel}>W{i + 1}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Recent Updates */}
        <View style={styles.updatesCard}>
          <Text style={styles.updatesTitle}>Recent Updates</Text>
          {historyList.length > 0 ? (
            historyList.map((log, index) => {
              if (!log) return null;
              return (
                <View key={log.id || `log-${index}`} style={styles.updateRow}>
                  <Text style={styles.updateDate}>{formatDate(log.logged_at)}</Text>
                  <View style={styles.updateRight}>
                    <Text style={styles.updateWeight}>{(Number(log.weight_kg) || 0).toFixed(1)} kg</Text>
                    <Pressable
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteWeightLog(log.id)}
                      hitSlop={8}
                    >
                      <Trash2 size={16} color="#FDA4AF" />
                    </Pressable>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Scale size={32} color="#CBD5E1" />
              <Text style={styles.emptyText}>Chưa ghi nhận lịch sử cân nặng</Text>
            </View>
          )}

          {isLoading && (
            <ActivityIndicator size="small" color="#0EA5E9" style={{ marginTop: 16 }} />
          )}
        </View>

        {/* AI Insight Card */}
        <View style={styles.insightCard}>
          <View style={styles.sparkleWrap}>
            <Sparkles size={16} color="#34D399" />
            <Text style={styles.insightBadge}>AI Insight</Text>
          </View>
          <Text style={styles.insightTitle}>
            {diff < 0 ? "Great progress 🎉" : diff > 0 ? "Stay focused 💪" : "Steady & stable ⚖️"}
          </Text>
          <Text style={styles.insightSub}>
            {diff < 0
              ? `You lost ${Math.abs(diff).toFixed(1)}kg recently. Keep your current eating habit and hydration routine.`
              : diff > 0
              ? `You gained ${diff.toFixed(1)}kg recently. Consider reviewing your daily caloric intake and logging all meals.`
              : "Your weight has been consistent. Continue staying hydrated and balancing your macro nutrients."}
          </Text>
        </View>
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
      </Pressable>

      {/* Slide up Log Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalDismiss} onPress={() => setModalVisible(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Weight</Text>
              <Pressable style={styles.modalCloseBtn} onPress={() => setModalVisible(false)}>
                <X size={20} color="#475569" />
              </Pressable>
            </View>

            {/* Input Row */}
            <View style={styles.modalInputWrap}>
              <TextInput
                style={styles.modalWeightInput}
                keyboardType="numeric"
                placeholder="68.5"
                placeholderTextColor="#94A3B8"
                value={weightInput}
                onChangeText={setWeightInput}
                autoFocus
              />
              <Text style={styles.modalWeightUnit}>kg</Text>
            </View>

            <TextInput
              style={styles.modalNoteInput}
              placeholder="Thêm ghi chú (tùy chọn)..."
              placeholderTextColor="#94A3B8"
              value={noteInput}
              onChangeText={setNoteInput}
            />

            <Pressable
              style={[styles.modalSaveBtn, saving && styles.modalBtnDisabled]}
              onPress={handleAddWeightLog}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSaveText}>Save Weight</Text>
              )}
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9F8" },
  scroll: { paddingHorizontal: 24, paddingTop: 12 },

  errorBanner: {
    backgroundColor: "#FCA5A5",
    padding: 12,
    alignItems: "center",
  },
  errorText: { color: "#7F1D1D", fontWeight: "700" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 20,
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
  title: { fontSize: 22, fontWeight: "900", color: "#0F172A" },
  subtitle: { fontSize: 13, color: "#94A3B8", marginTop: 4, fontWeight: "500" },
  placeholder: { width: 44 },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "700",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
  },
  statUnit: {
    fontSize: 14,
    fontWeight: "700",
    color: "#94A3B8",
  },

  goalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  goalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  goalLabel: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "700",
    marginBottom: 4,
  },
  goalValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#10B981",
  },

  trendCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  trendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  trendTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
  },

  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 140,
    paddingHorizontal: 8,
  },
  chartColumn: {
    alignItems: "center",
    flex: 1,
  },
  chartBarContainer: {
    height: "80%",
    justifyContent: "flex-end",
    alignItems: "center",
    width: "100%",
    marginBottom: 6,
  },
  chartBar: {
    width: 24,
    backgroundColor: "#0EA5E9",
    borderRadius: 12,
  },
  chartLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "800",
  },

  updatesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  updatesTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 16,
  },
  updateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  updateDate: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  updateRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  updateWeight: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#FFF1F2",
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },

  insightCard: {
    backgroundColor: "#0F172A",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  sparkleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  insightBadge: {
    color: "#34D399",
    fontSize: 12,
    fontWeight: "800",
  },
  insightTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  insightSub: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
  },

  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#10CDBA",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 50,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  modalDismiss: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 70,
    marginBottom: 16,
  },
  modalWeightInput: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginRight: 6,
    padding: 0,
  },
  modalWeightUnit: {
    fontSize: 20,
    color: "#94A3B8",
    fontWeight: "700",
  },
  modalNoteInput: {
    height: 50,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    marginBottom: 20,
  },
  modalSaveBtn: {
    backgroundColor: "#0F172A",
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  modalBtnDisabled: {
    backgroundColor: "#94A3B8",
  },
  modalSaveText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
});

