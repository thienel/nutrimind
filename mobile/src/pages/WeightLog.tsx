/**
 * WeightLog screen — log cân nặng (offline-first)
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, Scale, TrendingDown, TrendingUp, Minus as TrendMinus, Trash2 } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { useWeightLog, useWeightChart } from "@/hooks/useWeightLog";
import { OfflineBanner } from "@/components/OfflineBanner";

export function WeightLog() {
  const { user } = useAuth();
  const { history, latestWeight, addWeight, removeWeight, isLoading } =
    useWeightLog(user?.id ?? null, 20);
  const chartData = useWeightChart(user?.id ?? null, 14);

  const [weightInput, setWeightInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const w = parseFloat(weightInput);
    if (!w || w < 20 || w > 500) {
      Alert.alert("Giá trị không hợp lệ", "Nhập cân nặng hợp lệ (20-500 kg)");
      return;
    }
    setSaving(true);
    await addWeight(w, noteInput.trim() || undefined);
    setSaving(false);
    setWeightInput("");
    setNoteInput("");
  };

  const handleDelete = (id: string) => {
    Alert.alert("Xóa?", "Xóa bản ghi này?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: () => removeWeight(id) },
    ]);
  };

  // Tính trend
  const getTrend = (): {
    icon: React.ReactNode;
    text: string;
    color: string;
  } => {
    if (chartData.length < 2) return { icon: null, text: "Chưa đủ dữ liệu", color: "#94A3B8" };
    const first = chartData[0].weight_kg;
    const last = chartData[chartData.length - 1].weight_kg;
    const diff = last - first;
    if (Math.abs(diff) < 0.1)
      return {
        icon: <TrendMinus size={16} color="#94A3B8" />,
        text: "Ổn định",
        color: "#94A3B8",
      };
    if (diff < 0)
      return {
        icon: <TrendingDown size={16} color="#10B981" />,
        text: `Giảm ${Math.abs(diff).toFixed(1)} kg`,
        color: "#10B981",
      };
    return {
      icon: <TrendingUp size={16} color="#EF4444" />,
      text: `Tăng ${diff.toFixed(1)} kg`,
      color: "#EF4444",
    };
  };

  const trend = getTrend();

  // Mini sparkline (bar chart bằng View)
  const maxWeight =
    chartData.length > 0 ? Math.max(...chartData.map((d) => d.weight_kg)) : 100;
  const minWeight =
    chartData.length > 0 ? Math.min(...chartData.map((d) => d.weight_kg)) : 50;
  const range = maxWeight - minWeight || 1;

  const todayFormatted = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <OfflineBanner pushContent />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#0F172A" />
          </Pressable>
          <View>
            <Text style={styles.title}>Theo dõi cân nặng</Text>
            <Text style={styles.subtitle}>{todayFormatted}</Text>
          </View>
        </View>

        {/* Current Weight Card */}
        <View style={styles.currentCard}>
          <View style={styles.scaleIconWrap}>
            <Scale size={32} color="#8B5CF6" />
          </View>
          <Text style={styles.currentLabel}>Cân nặng hiện tại</Text>
          <Text style={styles.currentWeight}>
            {latestWeight != null
              ? latestWeight.toFixed(1)
              : "—"}
            <Text style={styles.currentUnit}> kg</Text>
          </Text>

          {/* Trend indicator */}
          <View style={styles.trendRow}>
            {trend.icon}
            <Text style={[styles.trendText, { color: trend.color }]}>
              {trend.text}
            </Text>
            <Text style={styles.trendSub}> (14 ngày)</Text>
          </View>

          {/* Mini chart */}
          {chartData.length > 1 && (
            <View style={styles.sparkline}>
              {chartData.map((d, i) => {
                const heightPct = ((d.weight_kg - minWeight) / range) * 60 + 10;
                return (
                  <View key={i} style={styles.sparkBar}>
                    <View
                      style={[
                        styles.sparkFill,
                        {
                          height: heightPct,
                          backgroundColor:
                            i === chartData.length - 1 ? "#8B5CF6" : "#DDD6FE",
                        },
                      ]}
                    />
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Add Weight Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Ghi cân nặng mới</Text>

          <View style={styles.weightInputRow}>
            <TextInput
              style={styles.weightInput}
              placeholder="0.0"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              value={weightInput}
              onChangeText={setWeightInput}
            />
            <Text style={styles.weightUnit}>kg</Text>
          </View>

          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            placeholder="Ghi chú (tùy chọn)"
            placeholderTextColor="#94A3B8"
            value={noteInput}
            onChangeText={setNoteInput}
          />

          <Pressable
            style={[styles.addBtn, saving && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={saving}
          >
            <Scale size={18} color="#fff" />
            <Text style={styles.addBtnText}>
              {saving ? "Đang lưu..." : "Lưu cân nặng"}
            </Text>
          </Pressable>
        </View>

        {/* History */}
        {history.length > 0 && (
          <View style={styles.historyCard}>
            <Text style={styles.formTitle}>Lịch sử</Text>
            {history.map((log) => {
              const date = new Date(log.logged_at).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });
              const time = new Date(log.logged_at).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <View key={log.id} style={styles.historyItem}>
                  <View style={styles.historyLeft}>
                    <View style={styles.historyDot} />
                    <View>
                      <Text style={styles.historyWeight}>
                        {log.weight_kg.toFixed(1)}{" "}
                        <Text style={styles.historyUnit}>kg</Text>
                      </Text>
                      <Text style={styles.historyDate}>
                        {date} · {time}
                      </Text>
                      {log.note ? (
                        <Text style={styles.historyNote}>{log.note}</Text>
                      ) : null}
                    </View>
                  </View>
                  <Pressable
                    onPress={() => handleDelete(log.id)}
                    hitSlop={8}
                  >
                    <Trash2 size={15} color="#CBD5E1" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {history.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Scale size={40} color="#DDD6FE" />
            <Text style={styles.emptyText}>Chưa có bản ghi cân nặng nào</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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

  currentCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  scaleIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F5F3FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  currentLabel: { fontSize: 13, color: "#94A3B8", marginBottom: 8 },
  currentWeight: { fontSize: 52, fontWeight: "800", color: "#4C1D95" },
  currentUnit: { fontSize: 24, fontWeight: "600", color: "#C4B5FD" },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  trendText: { fontSize: 13, fontWeight: "700" },
  trendSub: { fontSize: 11, color: "#94A3B8" },

  sparkline: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    height: 80,
    marginTop: 20,
    width: "100%",
  },
  sparkBar: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  sparkFill: { width: "70%", borderRadius: 4 },

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
  weightInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#8B5CF6",
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 64,
  },
  weightInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: "800",
    color: "#4C1D95",
  },
  weightUnit: {
    fontSize: 18,
    color: "#A78BFA",
    fontWeight: "600",
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#8B5CF6",
    borderRadius: 14,
    height: 50,
    marginTop: 14,
  },
  addBtnDisabled: { backgroundColor: "#DDD6FE" },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  historyLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#8B5CF6",
  },
  historyWeight: { fontSize: 16, fontWeight: "700", color: "#4C1D95" },
  historyUnit: { fontSize: 12, color: "#C4B5FD" },
  historyDate: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  historyNote: { fontSize: 11, color: "#64748B", marginTop: 2, fontStyle: "italic" },

  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText: { color: "#94A3B8", fontSize: 14 },
});
