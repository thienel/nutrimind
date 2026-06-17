import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
} from "react-native";
import {
  Bell,
  Droplets,
  BrainCircuit,
  ChartColumn,
  Plus,
  Sparkles,
  ArrowRight,
  Scale,
  X,
  Trophy,
} from "lucide-react-native";
import { router } from "expo-router";

export default function HomeScreen() {
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weight, setWeight] = useState("68.5");

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: 140 }]}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.hello}>Hello,</Text>
            <Text style={styles.name}>Linh 👋</Text>
            <Text style={styles.sub}>Let’s make today amazing</Text>
          </View>

          <TouchableOpacity style={styles.bellBtn}>
            <Bell size={20} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* DAILY SUMMARY */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Summary</Text>

          <View style={styles.summaryRow}>
            {/* vòng progress */}
            <View style={styles.progressCircle}>
              <Text style={styles.kcal}>1350</Text>
              <Text style={styles.kcalSub}>/ 2000 kcal</Text>
            </View>

            <View style={styles.macroWrap}>
              <Macro label="Protein" value="75 / 120g" color="#8B5CF6" />
              <Macro label="Carbs" value="160 / 250g" color="#06B6D4" />
              <Macro label="Fat" value="45 / 65g" color="#F59E0B" />
            </View>
          </View>

          <View style={styles.trackBox}>
            <Text style={styles.trackText}>💚 You’re on track! Keep it up</Text>
          </View>
        </View>

        {/* AI MISSION */}
        <View style={styles.card}>
          <View style={styles.missionHeader}>
            <View style={styles.sparkBox}>
              <Sparkles size={18} color="#10B981" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.missionTitle}>AI Daily Mission</Text>
              <Text style={styles.missionSub}>Your roadmap for today</Text>
            </View>

            <Text style={styles.progressText}>2/4</Text>
          </View>

          <Mission text="Drink 8 glasses of water" done />
          <Mission text="Eat 40g protein" />
          <Mission text="Complete 3 meals" />
          <Mission text="Keep under 1800 kcal" done />
        </View>

        {/* STREAK */}
        <View style={styles.streakCard}>
          <Text style={styles.streakLabel}>Daily Streak</Text>
          <Text style={styles.streakTitle}>🔥 6 Days</Text>
          <Text style={styles.streakSub}>
            You’ve stayed consistent for 6 days
          </Text>

          <View style={styles.streakBar}>
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <View
                key={i}
                style={[
                  styles.streakDot,
                  i <= 6 && { backgroundColor: "white" },
                ]}
              />
            ))}
          </View>
        </View>

        {/* WEIGHT */}
        <View style={styles.card}>
          <View style={styles.weightTop}>
            <View>
              <Text style={styles.weightLabel}>Weekly Weight Check</Text>
              <Text style={styles.weight}>{weight} kg</Text>
              <Text style={styles.weightSub}>Last updated 7 days ago</Text>
            </View>

            <View style={styles.weightIcon}>
              <Scale size={22} color="#155E75" />
            </View>
          </View>

          <TouchableOpacity
            style={styles.weightBtn}
            onPress={() => setShowWeightModal(true)}
          >
            <Text style={styles.weightBtnText}>Update Weight</Text>
          </TouchableOpacity>
        </View>

        {/* QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.quickGrid}>
          <QuickAction
            icon={<Plus size={20} color="white" />}
            title="Log Meal"
            color="#10B981"
          />

          <QuickAction
            icon={<Droplets size={20} color="white" />}
            title="Water"
            color="#06B6D4"
          />

          <QuickAction
            icon={<BrainCircuit size={20} color="white" />}
            title="AI Coach"
            color="#8B5CF6"
          />

          <QuickAction
            icon={<ChartColumn size={20} color="white" />}
            title="Report"
            color="#EC4899"
          />
        </View>

        {/* FRIEND MOTIVATION */}
        <Text style={styles.sectionTitle}>Stay Motivated 🔥</Text>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push("/friends")}
        >
          <View style={styles.friendCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.friendLabel}>Friends Motivation</Text>
              <Text style={styles.friendTitle}>4 friends active 💪</Text>
              <Text style={styles.friendSub}>
                Linh completed hydration • Minh hit protein target
              </Text>
            </View>

            <View style={styles.friendIcon}>
              <Trophy size={22} color="#0F172A" />
            </View>
          </View>
        </TouchableOpacity>
        {/* ACTIVE CHALLENGE */}
        <View style={styles.challengeCard}>
          <Text style={styles.challengeLabel}>Active Challenge</Text>
          <Text style={styles.challengeTitle}>Hydration Hero 💧</Text>
          <Text style={styles.challengeSub}>5 / 7 days completed</Text>

          <View style={styles.challengeProgress}>
            <View style={styles.challengeFill} />
          </View>
        </View>

        {/* AI INSIGHT */}
        <View style={styles.insightCard}>
          <Text style={styles.insightBadge}>AI Insight</Text>

          <Text style={styles.insightTitle}>You are low on protein today</Text>

          <Text style={styles.insightSub}>
            Try chicken breast, yogurt, or eggs for dinner.
          </Text>

          <TouchableOpacity style={styles.insightBtn}>
            <Text style={styles.insightBtnText}>Ask AI Coach</Text>
            <ArrowRight size={18} color="white" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL UPDATE WEIGHT */}
      <Modal visible={showWeightModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Weight</Text>

              <TouchableOpacity onPress={() => setShowWeightModal(false)}>
                <X size={20} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => setShowWeightModal(false)}
            >
              <Text style={styles.saveText}>Save Weight</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Macro({ label, value, color }: any) {
  return (
    <View style={styles.macroItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>{value}</Text>
      </View>
    </View>
  );
}

function Mission({ text, done = false }: any) {
  return (
    <View style={styles.missionItem}>
      <Text style={{ color: done ? "#10B981" : "#CBD5E1" }}>
        {done ? "✓" : "○"}
      </Text>
      <Text style={styles.missionText}>{text}</Text>
    </View>
  );
}

function QuickAction({ icon, title, color }: any) {
  return (
    <TouchableOpacity style={styles.quickActionCard}>
      <View style={[styles.quickIcon, { backgroundColor: color }]}>{icon}</View>
      <Text style={styles.quickText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9F8",
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  hello: {
    color: "#94A3B8",
    fontSize: 14,
  },
  name: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
  },
  sub: {
    color: "#64748B",
    marginTop: 4,
  },

  bellBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    backgroundColor: "white",
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,

    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  cardTitle: {
    fontWeight: "700",
    fontSize: 16,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },

  progressCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    borderColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },

  kcal: {
    fontSize: 34,
    fontWeight: "800",
  },

  kcalSub: {
    color: "#94A3B8",
    fontSize: 12,
  },

  macroWrap: {
    justifyContent: "space-around",
  },

  macroItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 10,
  },

  macroLabel: {
    color: "#94A3B8",
    fontSize: 13,
  },

  macroValue: {
    fontWeight: "700",
    marginTop: 2,
  },

  trackBox: {
    marginTop: 20,
    backgroundColor: "#ECFDF5",
    padding: 14,
    borderRadius: 999,
  },

  trackText: {
    textAlign: "center",
    color: "#10B981",
    fontWeight: "600",
  },

  missionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  sparkBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  missionTitle: {
    fontWeight: "700",
    fontSize: 17,
  },

  missionSub: {
    color: "#64748B",
    fontSize: 13,
  },

  progressText: {
    color: "#10B981",
    fontWeight: "700",
  },

  missionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },

  missionText: {
    marginLeft: 12,
    color: "#334155",
  },

  streakCard: {
    backgroundColor: "#F97316",
    borderRadius: 32,
    padding: 22,
    marginBottom: 20,
  },

  streakLabel: {
    color: "rgba(255,255,255,0.8)",
  },

  streakTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "white",
    marginTop: 6,
  },

  streakSub: {
    color: "rgba(255,255,255,0.8)",
    marginTop: 8,
  },

  streakBar: {
    flexDirection: "row",
    marginTop: 16,
    gap: 6,
  },

  streakDot: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.3)",
  },

  weightTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  weightSub: {
    marginTop: 8,
    color: "#64748B",
    fontSize: 13,
  },

  weightIcon: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: "#ECFEFF",
    justifyContent: "center",
    alignItems: "center",
  },

  quickGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },

  quickActionCard: {
    width: 80,
    height: 98,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  quickIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  quickText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 10,
    fontWeight: "600",
  },

  friendCard: {
    backgroundColor: "white",
    borderRadius: 28,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,

    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },

  friendLabel: {
    fontSize: 13,
    color: "#94A3B8",
  },

  friendTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 6,
    color: "#0F172A",
  },

  friendSub: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 8,
    lineHeight: 20,
  },

  friendIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  challengeCard: {
    position: "relative",
    backgroundColor: "#1E3A8A",
    borderRadius: 28,
    padding: 20,
    marginBottom: 18,
    overflow: "hidden",
  },

  challengeLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },

  challengeTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 8,
  },

  challengeSub: {
    color: "rgba(255,255,255,0.7)",
    marginTop: 8,
  },

  challengeProgress: {
    marginTop: 18,
    height: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 999,
    overflow: "hidden",
  },

  challengeFill: {
    width: "72%",
    height: "100%",
    backgroundColor: "white",
    borderRadius: 999,
  },

  insightCard: {
    backgroundColor: "#0F172A",
    borderRadius: 30,
    padding: 22,
    marginBottom: 20,

    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4,
  },

  insightBadge: {
    color: "#34D399",
    fontWeight: "700",
  },

  insightTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
    marginTop: 16,
  },

  insightSub: {
    color: "#CBD5E1",
    marginTop: 12,
    lineHeight: 24,
  },

  insightBtn: {
    marginTop: 18,
    backgroundColor: "#10B981",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",

    shadowColor: "#10B981",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 3,
  },

  insightBtnText: {
    color: "white",
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.35)",
    justifyContent: "flex-end",
  },

  modal: {
    backgroundColor: "white",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
  },

  input: {
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    padding: 20,
    fontSize: 34,
    fontWeight: "700",
    textAlign: "center",
  },

  saveBtn: {
    marginTop: 20,
    backgroundColor: "#0F172A",
    borderRadius: 999,
    padding: 18,
    alignItems: "center",
  },

  saveText: {
    color: "white",
    fontWeight: "700",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 14,
    marginTop: 10,
  },

  weightLabel: {
    fontSize: 13,
    color: "#94A3B8",
  },

  weight: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 6,
  },

  weightBtn: {
    marginTop: 16,
    backgroundColor: "#0F172A",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },

  weightBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 14,
  },
});
