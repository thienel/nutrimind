/**
 * WaterLog screen — log nước uống (offline-first)
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
import { ArrowLeft, Droplets, Plus, Minus, Trash2 } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { useWaterLog } from "@/hooks/useWaterLog";
import { OfflineBanner } from "@/components/OfflineBanner";

// Các mức nhanh để chọn (ml)
const QUICK_AMOUNTS = [150, 200, 250, 350, 500];

/** Mục tiêu nước uống mặc định (ml) */
const DAILY_GOAL_ML = 2000;

export function WaterLog() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const { logs, totalMl, addWater, removeWater, isLoading } = useWaterLog(
    user?.id ?? null,
    today
  );

  const [customAmount, setCustomAmount] = useState("250");
  const [saving, setSaving] = useState(false);

  const progressPct = Math.min((totalMl / DAILY_GOAL_ML) * 100, 100);

  const handleAdd = async (amountMl: number) => {
    if (!amountMl || amountMl <= 0) return;
    setSaving(true);
    await addWater(amountMl);
    setSaving(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert("Xóa?", "Xóa lần uống này?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: () => removeWater(id) },
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
          <View>
            <Text style={styles.title}>Log Nước Uống</Text>
            <Text style={styles.subtitle}>{todayFormatted}</Text>
          </View>
        </View>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.waterIconWrap}>
            <Droplets size={36} color="#3B82F6" />
          </View>
          <Text style={styles.totalText}>
            {(totalMl / 1000).toFixed(2)}
            <Text style={styles.totalUnit}> L</Text>
          </Text>
          <Text style={styles.goalText}>
            Mục tiêu: {DAILY_GOAL_ML / 1000}L mỗi ngày
          </Text>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${progressPct}%` as any }]}
            />
          </View>
          <Text style={styles.progressPct}>{Math.round(progressPct)}%</Text>
        </View>

        {/* Quick add */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thêm nhanh</Text>
          <View style={styles.quickRow}>
            {QUICK_AMOUNTS.map((ml) => (
              <Pressable
                key={ml}
                style={styles.quickBtn}
                onPress={() => handleAdd(ml)}
                disabled={saving}
              >
                <Droplets size={16} color="#3B82F6" />
                <Text style={styles.quickBtnText}>{ml}ml</Text>
              </Pressable>
            ))}
          </View>

          {/* Custom amount */}
          <View style={styles.customRow}>
            <Pressable
              style={styles.stepBtn}
              onPress={() =>
                setCustomAmount((v) =>
                  String(Math.max(50, (parseInt(v) || 250) - 50))
                )
              }
            >
              <Minus size={18} color="#3B82F6" />
            </Pressable>
            <View style={styles.customInputWrap}>
              <TextInput
                style={styles.customInput}
                keyboardType="number-pad"
                value={customAmount}
                onChangeText={setCustomAmount}
              />
              <Text style={styles.customUnit}>ml</Text>
            </View>
            <Pressable
              style={styles.stepBtn}
              onPress={() =>
                setCustomAmount((v) =>
                  String((parseInt(v) || 250) + 50)
                )
              }
            >
              <Plus size={18} color="#3B82F6" />
            </Pressable>
            <Pressable
              style={[styles.addBtn, saving && styles.addBtnDisabled]}
              onPress={() => handleAdd(parseInt(customAmount) || 250)}
              disabled={saving}
            >
              <Text style={styles.addBtnText}>Thêm</Text>
            </Pressable>
          </View>
        </View>

        {/* Log History */}
        {logs.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Hôm nay</Text>
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
                    <Trash2 size={15} color="#CBD5E1" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {logs.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Droplets size={40} color="#BFDBFE" />
            <Text style={styles.emptyText}>Chưa log nước hôm nay</Text>
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

  progressCard: {
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
  waterIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  totalText: {
    fontSize: 48,
    fontWeight: "800",
    color: "#1E40AF",
  },
  totalUnit: { fontSize: 24, fontWeight: "600", color: "#93C5FD" },
  goalText: { color: "#94A3B8", fontSize: 13, marginTop: 4, marginBottom: 16 },
  progressTrack: {
    width: "100%",
    height: 10,
    backgroundColor: "#DBEAFE",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 5,
  },
  progressPct: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#3B82F6",
  },

  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 14,
  },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  quickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
  },
  quickBtnText: { color: "#2563EB", fontWeight: "600", fontSize: 13 },

  customRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  customInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  customUnit: { color: "#94A3B8", fontSize: 13 },
  addBtn: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingHorizontal: 18,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnDisabled: { backgroundColor: "#BFDBFE" },
  addBtnText: { color: "#fff", fontWeight: "700" },

  logItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  logLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3B82F6",
  },
  logAmount: { fontSize: 15, fontWeight: "700", color: "#1E40AF" },
  logUnit: { fontSize: 12, color: "#93C5FD" },
  logTime: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  deleteBtn: { padding: 4 },

  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: { color: "#94A3B8", fontSize: 14 },
});
