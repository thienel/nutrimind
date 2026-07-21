import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { ChevronLeft, Trophy } from "lucide-react-native";
import { router } from "expo-router";
import {
  getChallengeCatalogue,
  getMyChallenges,
  joinChallenge,
} from "@/services/challenge.service";
import type { CatalogueChallengeItemResponse } from "@/app/(tabs)/home";

export default function ChallengesScreen() {
  const [myChallenges, setMyChallenges] = useState<
    CatalogueChallengeItemResponse[]
  >([]);
  const [catalogue, setCatalogue] = useState<
    CatalogueChallengeItemResponse[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [joined, available] = await Promise.all([
          getMyChallenges(),
          getChallengeCatalogue(),
        ]);
        setMyChallenges(joined);
        setCatalogue(available);
      } catch {
        // fallback mặc định là mảng rỗng
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#0F4C81" />
          </View>
        ) : (
          <>
            {/* ACTIVE CHALLENGE — dùng getMyChallenges() */}
            {myChallenges.length > 0 ? (
              myChallenges.map((ch, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.activeCard}
                  onPress={() =>
                    router.push({
                      pathname: "/challenge-detail",
                      params: {
                        id: String(ch.id),
                        name: ch.name,
                        type: ch.type ?? "",
                      },
                    })
                  }
                >
                  <Text style={styles.activeTitle}>{ch.name}</Text>
                  {ch.description && (
                    <Text style={styles.activeSub}>{ch.description}</Text>
                  )}
                  {ch.my_enrollment && (
                    <View style={styles.progressWrap}>
                      <Text style={styles.progressText}>
                        {ch.my_enrollment.day_current} /{" "}
                        {ch.my_enrollment.day_total} days
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Trophy size={28} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>
                  No active challenge yet
                </Text>
                <Text style={styles.emptySub}>
                  Join a challenge to stay motivated
                </Text>
              </View>
            )}

            {/* AVAILABLE CHALLENGES — catalogue từ API */}
            {catalogue.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Available Challenges
                </Text>
                {catalogue.map((ch, i) => (
                  <ChallengeCard
                    key={ch.id ?? i}
                    title={ch.name}
                    subtitle={ch.description}
                    onJoin={() => handleJoin(ch.id, ch.name, ch.type ?? "")}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function handleJoin(challengeId: number, challengeName: string, challengeType: string) {
  joinChallenge(challengeId).then((result) => {
    if (result) {
      router.push({
        pathname: "/challenge-detail",
        params: { id: String(challengeId), name: challengeName, type: challengeType },
      });
    }
  });
}

/**
 * ChallengeCard với layout:
 * [Icon] Title (flex:1, không overlap)
 *        Subtitle (tối đa 2 dòng)         [Join]
 * Join button có minWidth, không shrink.
 */
function ChallengeCard({
  title,
  subtitle,
  onJoin,
}: {
  title: string;
  subtitle?: string;
  onJoin?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.challengeCard}
      onPress={onJoin}
      activeOpacity={0.7}
    >
      <View style={styles.challengeLeft}>
        <View style={styles.challengeIcon}>
          <Trophy size={20} color="#0F4C81" />
        </View>
        {/* Text wrapper: flex:1 + flexShrink để không bị button đè */}
        <View style={styles.challengeTextWrap}>
          <Text style={styles.challengeTitle} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.challengeSub} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.joinBtn}>
        <Text style={styles.joinText}>Join</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9F8" },
  content: { padding: 24, paddingTop: 60, paddingBottom: 120 },
  header: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#0F172A" },
  headerSub: { fontSize: 13, color: "#94A3B8", marginTop: 4 },

  loadingWrap: { marginTop: 60, alignItems: "center" },

  emptyCard: {
    marginTop: 28,
    backgroundColor: "white",
    borderRadius: 32,
    padding: 32,
    alignItems: "center",
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  emptySub: { fontSize: 14, color: "#94A3B8", marginTop: 8, textAlign: "center" },

  section: { marginTop: 30 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 16,
  },

  // Active challenge card
  activeCard: {
    marginTop: 28,
    backgroundColor: "#0F4C81",
    borderRadius: 32,
    padding: 22,
  },
  activeTitle: { fontSize: 24, fontWeight: "800", color: "white" },
  activeSub: { color: "rgba(255,255,255,.75)", marginTop: 8, lineHeight: 22 },
  progressWrap: { marginTop: 16 },
  progressText: { color: "white", fontWeight: "600" },

  // ChallengeCard layout — flex:1 text, không shrink button
  challengeCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  challengeLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
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
  challengeTextWrap: {
    flex: 1,
    flexShrink: 1,
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    flexShrink: 0,
    minWidth: 60,
    alignItems: "center",
  },
  joinText: { color: "white", fontWeight: "700" },
});
