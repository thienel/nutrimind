import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { ChevronLeft, Trophy, Users, CheckCircle2, Circle, Flame } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  getChallengeProgress,
  abandonChallenge,
  joinChallenge,
  type ChallengeProgressData,
} from "@/services/challenge.service";

export default function ChallengeDetailScreen() {
  const { id, name, type } = useLocalSearchParams<{
    id?: string;
    name?: string;
    type?: string;
  }>();

  const challengeId = id ? Number(id) : null;
  const [data, setData] = useState<ChallengeProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const fetchProgress = useCallback(async () => {
    if (!challengeId) return;
    setLoading(true);
    const result = await getChallengeProgress(challengeId);
    setData(result);
    setLoading(false);
  }, [challengeId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const handleJoin = async () => {
    if (!challengeId || joining) return;
    setJoining(true);
    const result = await joinChallenge(challengeId);
    if (result) {
      await fetchProgress();
    }
    setJoining(false);
  };

  const handleLeave = async () => {
    if (!challengeId || leaving) return;
    setLeaving(true);
    const success = await abandonChallenge(challengeId);
    if (success) {
      router.back();
    }
    setLeaving(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  const myProgress = data?.my_progress;
  const isEnrolled = myProgress != null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={22} color="#475569" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {data?.challenge.name ?? name ?? "Challenge Detail"}
          </Text>
        </View>

        {/* Challenge Info Card */}
        {data?.challenge && (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Flame size={20} color="#F59E0B" />
              <Text style={styles.infoType}>
                {data.challenge.type === "hydration"
                  ? "💧 Hydration"
                  : data.challenge.type}
              </Text>
            </View>
            {isEnrolled && (
              <>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>Your Progress</Text>
                  <Text style={styles.progressDays}>
                    Day {myProgress.day_current} / {myProgress.day_total}
                  </Text>
                </View>
                {/* Progress Bar */}
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(
                          (myProgress.day_current / myProgress.day_total) * 100,
                          100,
                        )}%`,
                      },
                    ]}
                  />
                </View>
                {/* Day Grid */}
                <View style={styles.gridContainer}>
                  {myProgress.grid.map((day, i) => (
                    <View key={i} style={styles.dayCard}>
                      <Text style={styles.dayLabel}>
                        {new Date(day.date).toLocaleDateString("en-US", {
                          weekday: "short",
                        })}
                      </Text>
                      <Text style={styles.dayDate}>
                        {new Date(day.date).getDate()}
                      </Text>
                      {day.met_goal === true ? (
                        <CheckCircle2 size={18} color="#10B981" />
                      ) : day.met_goal === false ? (
                        <Circle size={18} color="#EF4444" />
                      ) : (
                        <Circle size={18} color="#CBD5E1" />
                      )}
                    </View>
                  ))}
                </View>
                {myProgress.badge_awarded && (
                  <View style={styles.badgeCard}>
                    <Trophy size={24} color="#F59E0B" />
                    <Text style={styles.badgeText}>🏆 Badge Earned!</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Action Buttons */}
        {!isEnrolled && (
          <TouchableOpacity
            style={[styles.joinBtn, joining && styles.disabledBtn]}
            onPress={handleJoin}
            disabled={joining}
          >
            <Text style={styles.joinBtnText}>
              {joining ? "Joining..." : "Join Challenge"}
            </Text>
          </TouchableOpacity>
        )}

        {isEnrolled && (
          <TouchableOpacity
            style={[styles.leaveBtn, leaving && styles.disabledBtn]}
            onPress={handleLeave}
            disabled={leaving}
          >
            <Text style={styles.leaveBtnText}>
              {leaving ? "Leaving..." : "Leave Challenge"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Friends Progress */}
        {data?.friends_progress && data.friends_progress.length > 0 && (
          <View style={styles.friendsSection}>
            <Text style={styles.sectionTitle}>Friends Progress</Text>
            {data.friends_progress.map((friend) => (
              <View key={friend.user_id} style={styles.friendCard}>
                <View style={styles.friendAvatar}>
                  <Text style={styles.friendInitial}>
                    {friend.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                  </Text>
                </View>
                <Text style={styles.friendName}>{friend.display_name}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {!isEnrolled && !data?.friends_progress?.length && (
          <View style={styles.emptyCard}>
            <Trophy size={32} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No progress to show yet</Text>
            <Text style={styles.emptySub}>
              Join this challenge to start tracking your progress
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9F8" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F7F9F8" },
  content: { padding: 24, paddingTop: 60, paddingBottom: 120 },
  header: {
    flexDirection: "row", alignItems: "center", marginBottom: 28,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 16,
    backgroundColor: "white", justifyContent: "center", alignItems: "center",
    marginRight: 14,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  infoCard: {
    backgroundColor: "white", borderRadius: 24, padding: 20, marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16,
  },
  infoType: { fontSize: 16, fontWeight: "700", color: "#334155" },
  progressHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  progressDays: { fontSize: 14, fontWeight: "700", color: "#10B981" },
  progressBar: {
    height: 8, backgroundColor: "#E2E8F0", borderRadius: 4, marginBottom: 20,
  },
  progressFill: {
    height: 8, backgroundColor: "#10B981", borderRadius: 4,
  },
  gridContainer: {
    flexDirection: "row", flexWrap: "wrap", gap: 8,
  },
  dayCard: {
    width: 44, alignItems: "center", backgroundColor: "#F1F5F9",
    borderRadius: 10, padding: 6,
  },
  dayLabel: { fontSize: 10, color: "#64748B", fontWeight: "600" },
  dayDate: { fontSize: 13, fontWeight: "700", color: "#0F172A" },
  badgeCard: {
    marginTop: 16, flexDirection: "row", alignItems: "center",
    backgroundColor: "#FEF3C7", borderRadius: 14, padding: 12, gap: 10,
  },
  badgeText: { fontSize: 15, fontWeight: "700", color: "#92400E" },
  joinBtn: {
    backgroundColor: "#10B981", height: 52, borderRadius: 18,
    justifyContent: "center", alignItems: "center", marginBottom: 20,
  },
  joinBtnText: { color: "white", fontWeight: "700", fontSize: 16 },
  disabledBtn: { opacity: 0.5 },
  leaveBtn: {
    borderColor: "#EF4444", borderWidth: 1.5, height: 52, borderRadius: 18,
    justifyContent: "center", alignItems: "center", marginBottom: 20,
  },
  leaveBtnText: { color: "#EF4444", fontWeight: "700", fontSize: 16 },
  friendsSection: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 20, fontWeight: "800", color: "#0F172A", marginBottom: 14,
  },
  friendCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "white",
    borderRadius: 16, padding: 14, marginBottom: 8, gap: 12,
  },
  friendAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#DBEAFE",
    justifyContent: "center", alignItems: "center",
  },
  friendInitial: { fontSize: 16, fontWeight: "700", color: "#1E40AF" },
  friendName: { fontSize: 15, fontWeight: "600", color: "#0F172A" },
  emptyCard: {
    backgroundColor: "white", borderRadius: 24, padding: 32,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18, fontWeight: "800", color: "#0F172A", marginTop: 12,
  },
  emptySub: {
    fontSize: 14, color: "#94A3B8", marginTop: 6, textAlign: "center",
  },
});
