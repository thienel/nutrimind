import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import {
  ChevronLeft,
  Trophy,
  Flame,
  Droplets,
  Sparkles,
  ArrowRight,
} from "lucide-react-native";
import { router } from "expo-router";

export default function ChallengesScreen() {
  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <ChevronLeft size={22} color="#475569" />
          </TouchableOpacity>

          <View style={{ marginLeft: 16 }}>
            <Text style={styles.headerTitle}>Challenges</Text>
            <Text style={styles.headerSub}>Stay consistent together 🔥</Text>
          </View>
        </View>

        {/* ACTIVE CHALLENGE */}
        <TouchableOpacity
          style={styles.activeCard}
          onPress={() => router.push("/challenge-detail")}
        >
          {/* glow effect */}
          <View style={styles.glowTop} />
          <View style={styles.glowBottom} />

          <View style={styles.activeBadge}>
            <Trophy size={16} color="white" />
            <Text style={styles.activeBadgeText}>Active Challenge</Text>
          </View>

          <Text style={styles.activeTitle}>7-Day Hydration</Text>

          <Text style={styles.activeSub}>
            Drink 2L water every day and stay hydrated.
          </Text>

          {/* progress */}
          <View style={styles.progressWrap}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>Progress</Text>
              <Text style={styles.progressText}>5 / 7 days</Text>
            </View>

            <View style={styles.progressBar}>
              <View style={styles.progressFill} />
            </View>
          </View>

          {/* CTA */}
          <View style={styles.ctaRow}>
            <Text style={styles.ctaText}>View Details</Text>
            <ArrowRight size={16} color="white" />
          </View>
        </TouchableOpacity>

        {/* PARTICIPANTS */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Participants</Text>

            <View style={styles.liveBadge}>
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>

          <ParticipantCard rank={1} name="Linh" progress="6 / 7" badge="🔥" />

          <ParticipantCard
            rank={2}
            name="You"
            progress="5 / 7"
            badge="💪"
            isMe
          />

          <ParticipantCard rank={3} name="Minh" progress="4 / 7" badge="👏" />

          <ParticipantCard rank={4} name="An" progress="2 / 7" badge="😭" />
        </View>

        {/* AVAILABLE CHALLENGES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Challenges</Text>

          <ChallengeCard
            icon={<Droplets size={20} color="#0891B2" />}
            title="Hydration Hero"
            subtitle="Drink enough water for 7 days"
          />

          <ChallengeCard
            icon={<Flame size={20} color="#EA580C" />}
            title="No Junk Food"
            subtitle="Avoid fast food for 5 days"
          />

          <ChallengeCard
            icon={<Sparkles size={20} color="#9333EA" />}
            title="Protein Boost"
            subtitle="Reach protein goal for 1 week"
          />
        </View>
      </ScrollView>
    </View>
  );
}

function ParticipantCard({ rank, name, progress, badge, isMe = false }: any) {
  return (
    <View style={[styles.participantCard, isMe && styles.meCard]}>
      <View style={styles.participantLeft}>
        <Text style={styles.rank}>#{rank}</Text>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0)}</Text>
        </View>

        <View>
          <View style={styles.nameRow}>
            <Text style={styles.participantName}>{name}</Text>

            {isMe && (
              <View style={styles.youBadge}>
                <Text style={styles.youText}>YOU</Text>
              </View>
            )}
          </View>

          <Text style={styles.participantProgress}>{progress}</Text>
        </View>
      </View>

      <Text style={styles.badgeEmoji}>{badge}</Text>
    </View>
  );
}

function ChallengeCard({ icon, title, subtitle }: any) {
  return (
    <TouchableOpacity
      style={styles.challengeCard}
      onPress={() => router.push("/challenge-detail")}
    >
      <View style={styles.challengeLeft}>
        <View style={styles.challengeIcon}>{icon}</View>

        <View>
          <Text style={styles.challengeTitle}>{title}</Text>
          <Text style={styles.challengeSub}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.joinBtn}>
        <Text style={styles.joinText}>Join</Text>
      </View>
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
    paddingBottom: 120,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
  },

  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
  },

  headerSub: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
  },

  activeCard: {
    marginTop: 28,
    backgroundColor: "#0F4C81",
    borderRadius: 32,
    padding: 22,
    overflow: "hidden",
  },

  glowTop: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,.08)",
  },

  glowBottom: {
    position: "absolute",
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,.08)",
  },

  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    alignSelf: "flex-start",
  },

  activeBadgeText: {
    color: "white",
    marginLeft: 6,
    fontWeight: "600",
    fontSize: 12,
  },

  activeTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "white",
    marginTop: 18,
  },

  activeSub: {
    color: "rgba(255,255,255,.75)",
    marginTop: 10,
    lineHeight: 22,
  },

  progressWrap: {
    marginTop: 24,
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  progressText: {
    color: "white",
    fontSize: 13,
  },

  progressBar: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,.2)",
  },

  progressFill: {
    width: "72%",
    height: "100%",
    backgroundColor: "white",
    borderRadius: 999,
  },

  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
  },

  ctaText: {
    color: "white",
    marginRight: 8,
    fontWeight: "600",
  },

  section: {
    marginTop: 30,
  },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 16,
  },

  liveBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  liveText: {
    color: "#16A34A",
    fontWeight: "700",
    fontSize: 11,
  },

  participantCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
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
  },

  rank: {
    width: 32,
    color: "#94A3B8",
    fontWeight: "700",
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: "#ECFEFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  avatarText: {
    color: "#0891B2",
    fontWeight: "800",
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  participantName: {
    fontWeight: "700",
    color: "#0F172A",
  },

  participantProgress: {
    color: "#94A3B8",
    marginTop: 4,
    fontSize: 13,
  },

  youBadge: {
    marginLeft: 8,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },

  youText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16A34A",
  },

  badgeEmoji: {
    fontSize: 24,
  },

  challengeCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  challengeLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  challengeIcon: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: "#F0FDFA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  challengeTitle: {
    fontWeight: "700",
    color: "#0F172A",
  },

  challengeSub: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 4,
  },

  joinBtn: {
    backgroundColor: "#0F4C81",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },

  joinText: {
    color: "white",
    fontWeight: "700",
  },
});
