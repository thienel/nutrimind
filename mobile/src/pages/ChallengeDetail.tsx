import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import {
  ChevronLeft,
  Trophy,
  Flame,
  Zap,
  CheckCircle2,
  Users,
} from "lucide-react-native";
import { router } from "expo-router";

export default function ChallengeDetailScreen() {
  const [joined, setJoined] = useState(false);

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

        {/* ACTIVE CHALLENGE */}
        {joined ? (
          <View style={styles.activeCard}>
            {/* glow decoration */}
            <View style={styles.glowTop} />
            <View style={styles.glowBottom} />

            <View style={styles.badge}>
              <Flame size={14} color="#FCD34D" />
              <Text style={styles.badgeText}>Active Challenge</Text>
            </View>

            <View style={styles.activeTop}>
              <View>
                <Text style={styles.activeTitle}>7-Day Sugar Free</Text>

                <View style={styles.syncRow}>
                  <CheckCircle2 size={14} color="white" />
                  <Text style={styles.syncText}>
                    Auto-synced from daily log
                  </Text>
                </View>
              </View>

              <View style={styles.dayBadge}>
                <Text style={styles.dayNumber}>5</Text>
                <Text style={styles.dayText}>Days</Text>
              </View>
            </View>

            {/* progress */}
            <View style={styles.progressWrap}>
              <View style={styles.progressTop}>
                <Text style={styles.progressLabel}>Your Progress</Text>
                <Text style={styles.progressLabel}>5 / 7 days</Text>
              </View>

              <View style={styles.progressBar}>
                <View style={styles.progressFill} />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.joinCard}>
            <View style={styles.joinTop}>
              <View style={styles.joinIcon}>
                <Zap size={24} color="#10B981" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.joinTitle}>7-Day Sugar Free</Text>
                <Text style={styles.joinSub}>
                  Cut out refined sugar for 7 days. Auto tracked.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.joinBtn}
              onPress={() => setJoined(true)}
            >
              <Text style={styles.joinBtnText}>Join Challenge</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* LEADERBOARD */}
        <View style={styles.leaderboardWrap}>
          <Text style={styles.sectionTitle}>Leaderboard</Text>

          <View style={styles.rankTag}>
            <Users size={13} color="#059669" />
            <Text style={styles.rankTagText}>Ranked by streak 🔥</Text>
          </View>

          <Participant
            rank={1}
            name="Linh Nguyen"
            streak={6}
            avatar="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150"
          />

          <Participant
            rank={2}
            name="You"
            streak={5}
            isMe
            avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
          />

          <Participant
            rank={3}
            name="Minh Tran"
            streak={4}
            avatar="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
          />

          <Participant
            rank={4}
            name="An Vo"
            streak={2}
            avatar="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150"
          />
        </View>
      </ScrollView>
    </View>
  );
}

function Participant({ rank, name, streak, avatar, isMe = false }: any) {
  return (
    <View style={[styles.participantCard, isMe && styles.meCard]}>
      <View style={styles.participantLeft}>
        <Text
          style={[
            styles.rank,
            rank === 1 && { color: "#F59E0B" },
            rank === 2 && { color: "#94A3B8" },
            rank === 3 && { color: "#FB923C" },
          ]}
        >
          #{rank}
        </Text>

        <View>
          <Image source={{ uri: avatar }} style={styles.avatar} />
          {rank === 1 && (
            <View style={styles.crown}>
              <Trophy size={12} color="#F59E0B" />
            </View>
          )}
        </View>

        <View>
          <View style={styles.nameRow}>
            <Text style={styles.participantName}>{name}</Text>

            {isMe && (
              <View style={styles.youTag}>
                <Text style={styles.youTagText}>YOU</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.streakBox}>
        <Flame size={15} color="#F97316" />
        <Text style={styles.streakNumber}>{streak}</Text>
      </View>
    </View>
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
    paddingBottom: 120,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },

  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },

  activeCard: {
    backgroundColor: "#10B981",
    borderRadius: 32,
    padding: 22,
    overflow: "hidden",
    marginBottom: 28,
  },

  glowTop: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  glowBottom: {
    position: "absolute",
    bottom: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.08)",
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  badgeText: {
    color: "white",
    marginLeft: 6,
    fontWeight: "600",
    fontSize: 12,
  },

  activeTop: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  activeTitle: {
    color: "white",
    fontSize: 28,
    fontWeight: "800",
  },

  syncRow: {
    flexDirection: "row",
    marginTop: 10,
    alignItems: "center",
  },

  syncText: {
    color: "white",
    marginLeft: 6,
    opacity: 0.9,
  },

  dayBadge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },

  dayNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#10B981",
  },

  dayText: {
    fontSize: 10,
    color: "#10B981",
    fontWeight: "700",
  },

  progressWrap: {
    marginTop: 24,
  },

  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  progressLabel: {
    color: "white",
    fontWeight: "600",
  },

  progressBar: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  progressFill: {
    width: "72%",
    height: "100%",
    backgroundColor: "white",
    borderRadius: 999,
  },

  joinCard: {
    backgroundColor: "white",
    borderRadius: 28,
    padding: 20,
    marginBottom: 28,
  },

  joinTop: {
    flexDirection: "row",
    gap: 14,
  },

  joinIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
  },

  joinTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },

  joinSub: {
    color: "#64748B",
    marginTop: 6,
  },

  joinBtn: {
    marginTop: 18,
    backgroundColor: "#10B981",
    height: 52,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  joinBtnText: {
    color: "white",
    fontWeight: "700",
  },

  leaderboardWrap: {
    gap: 14,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },

  rankTag: {
    flexDirection: "row",
    alignSelf: "flex-start",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: "center",
  },

  rankTagText: {
    marginLeft: 6,
    color: "#059669",
    fontSize: 12,
    fontWeight: "600",
  },

  participantCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  meCard: {
    borderWidth: 2,
    borderColor: "#10B981",
  },

  participantLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  rank: {
    width: 28,
    fontWeight: "800",
    color: "#CBD5E1",
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 999,
  },

  crown: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "white",
    borderRadius: 999,
    padding: 4,
  },

  participantName: {
    fontWeight: "700",
    color: "#0F172A",
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  youTag: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },

  youTagText: {
    fontSize: 10,
    color: "#10B981",
    fontWeight: "700",
  },

  streakBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },

  streakNumber: {
    marginLeft: 6,
    color: "#F97316",
    fontWeight: "700",
  },
});
