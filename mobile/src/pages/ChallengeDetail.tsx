import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { ChevronLeft, Trophy, Users } from "lucide-react-native";
import { router } from "expo-router";

export default function ChallengeDetailScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <ChevronLeft size={22} color="#475569" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Challenge Detail</Text>
        </View>

        {/* Empty state — chưa tham gia challenge nào */}
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Trophy size={32} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>No challenge joined yet</Text>
          <Text style={styles.emptySub}>
            Browse available challenges to get started
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.push("/challenges")}
          >
            <Text style={styles.browseBtnText}>Browse Challenges</Text>
          </TouchableOpacity>
        </View>

        {/* LEADERBOARD — empty state */}
        <View style={styles.leaderboardWrap}>
          <Text style={styles.sectionTitle}>Leaderboard</Text>
          <View style={styles.rankTag}>
            <Users size={13} color="#059669" />
            <Text style={styles.rankTagText}>Ranked by streak 🔥</Text>
          </View>
          <View style={styles.emptyLeaderboard}>
            <Text style={styles.emptyLeaderText}>
              No participants yet — be the first to join!
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9F8" },
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

  emptyCard: {
    backgroundColor: "white", borderRadius: 32, padding: 32,
    alignItems: "center", marginBottom: 28,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 999,
    backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  emptySub: { fontSize: 14, color: "#94A3B8", marginTop: 8, textAlign: "center" },
  browseBtn: {
    marginTop: 20, backgroundColor: "#0F4C81", height: 48, borderRadius: 18,
    justifyContent: "center", alignItems: "center", paddingHorizontal: 24,
  },
  browseBtnText: { color: "white", fontWeight: "700" },

  leaderboardWrap: { gap: 14 },
  sectionTitle: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  rankTag: {
    flexDirection: "row", alignSelf: "flex-start",
    backgroundColor: "#ECFDF5", paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, alignItems: "center",
  },
  rankTagText: { marginLeft: 6, color: "#059669", fontSize: 12, fontWeight: "600" },
  emptyLeaderboard: {
    backgroundColor: "white", borderRadius: 24, padding: 24, alignItems: "center",
  },
  emptyLeaderText: { color: "#94A3B8", fontSize: 14 },
});
