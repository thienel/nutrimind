import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { ChevronLeft, Trophy, Medal } from "lucide-react-native";
import { router } from "expo-router";
import {
  getLeaderboard,
  type LeaderboardData,
} from "@/services/challenge.service";

export default function LeaderboardScreen() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const result = await getLeaderboard();
      setData(result);
      setLoading(false);
    })();
  }, []);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy size={20} color="#F59E0B" />;
    if (rank === 2) return <Medal size={20} color="#94A3B8" />;
    if (rank === 3) return <Medal size={20} color="#D97706" />;
    return <Text style={styles.rankText}>{rank}</Text>;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={22} color="#475569" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leaderboard</Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#10B981" />
          </View>
        ) : data?.rankings && data.rankings.length > 0 ? (
          <>
            {/* Week Info */}
            <View style={styles.weekCard}>
              <Text style={styles.weekText}>
                📅 {data.week_start} → {data.week_end}
              </Text>
              {data.note ? (
                <Text style={styles.noteText}>{data.note}</Text>
              ) : null}
            </View>

            {/* Rankings */}
            {data.rankings.map((entry) => (
              <View
                key={entry.user_id}
                style={[
                  styles.rankCard,
                  entry.is_me && styles.myRankCard,
                ]}
              >
                <View style={styles.rankIcon}>
                  {getRankIcon(entry.rank)}
                </View>
                <View style={styles.rankAvatar}>
                  <Text style={styles.avatarText}>
                    {entry.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                  </Text>
                </View>
                <View style={styles.rankInfo}>
                  <Text style={styles.rankName}>
                    {entry.display_name}
                    {entry.is_me ? " (You)" : ""}
                  </Text>
                  <Text style={styles.rankGoals}>
                    {entry.goals_completed} goals completed
                  </Text>
                </View>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Trophy size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No rankings yet</Text>
            <Text style={styles.emptySub}>
              Rankings update at the start of each week
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9F8" },
  loadingWrap: {
    flex: 1, justifyContent: "center", alignItems: "center",
    paddingTop: 100,
  },
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
  weekCard: {
    backgroundColor: "#ECFDF5", borderRadius: 16, padding: 16,
    marginBottom: 20,
  },
  weekText: { fontSize: 14, fontWeight: "700", color: "#065F46" },
  noteText: { fontSize: 12, color: "#64748B", marginTop: 4 },
  rankCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "white", borderRadius: 18, padding: 16,
    marginBottom: 10, gap: 12,
  },
  myRankCard: {
    borderColor: "#10B981", borderWidth: 2,
  },
  rankIcon: {
    width: 32, alignItems: "center", justifyContent: "center",
  },
  rankText: {
    fontSize: 16, fontWeight: "800", color: "#64748B",
  },
  rankAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#DBEAFE", justifyContent: "center", alignItems: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "700", color: "#1E40AF" },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  rankGoals: { fontSize: 13, color: "#64748B", marginTop: 2 },
  emptyCard: {
    backgroundColor: "white", borderRadius: 24, padding: 40,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18, fontWeight: "800", color: "#0F172A", marginTop: 12,
  },
  emptySub: {
    fontSize: 14, color: "#94A3B8", marginTop: 6, textAlign: "center",
  },
});
