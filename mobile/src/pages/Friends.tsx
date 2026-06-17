import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, Flame, Droplets } from "lucide-react-native";

export default function Friends() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          {/* Nút quay lại */}
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={22} />
          </Pressable>

          <View style={{ marginLeft: 14 }}>
            <Text style={styles.title}>Friends Motivation</Text>

            <Text style={styles.subtitle}>Stay motivated together 💪</Text>
          </View>
        </View>

        {/* Card tổng quan số bạn đang active */}
        <View style={styles.activeCard}>
          <Text style={styles.activeLabel}>Active Friends</Text>

          <Text style={styles.activeCount}>4 Friends 🔥</Text>

          <Text style={styles.activeDesc}>
            Encourage each other and stay on track.
          </Text>

          {/* Nút sang màn Add Friend */}
          <Pressable
            style={styles.addFriendButton}
            onPress={() => router.push("/add-friend")}
          >
            <Text style={styles.addFriendText}>+ Add Friend</Text>
          </Pressable>
        </View>

        {/* Danh sách bạn bè */}
        <View style={{ marginTop: 20 }}>
          <FriendCard
            name="Linh"
            water="2.1L / 2.5L"
            status="Completed hydration goal 💧"
            streak="5-day streak"
          />

          <FriendCard
            name="Minh"
            water="1.8L / 2.5L"
            status="Hit protein target 💪"
            streak="3-day streak"
          />

          <FriendCard
            name="An"
            water="0.9L / 2.5L"
            status="Didn't log meal today"
            streak="1-day streak"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FriendCard({ name, water, status, streak }: any) {
  return (
    <View style={styles.friendCard}>
      {/* Thông tin bạn bè */}
      <View style={styles.friendTop}>
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0)}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.friendName}>{name}</Text>

          <Text style={styles.friendStatus}>{status}</Text>

          {/* Badge thông tin */}
          <View style={styles.badgeRow}>
            <MiniBadge
              icon={<Droplets size={14} color="#64748B" />}
              text={water}
            />

            <MiniBadge
              icon={<Flame size={14} color="#64748B" />}
              text={streak}
            />
          </View>
        </View>
      </View>

      {/* Các nút động viên */}
      <View style={styles.actionRow}>
        <ActionButton text="💪 Keep Going" />
        <ActionButton text="👏 Nice Job" />
        <ActionButton text="🔥 Great Progress" />
      </View>
    </View>
  );
}

function MiniBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.badge}>
      {icon}
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

function ActionButton({ text }: { text: string }) {
  return (
    <Pressable style={styles.actionButton}>
      <Text style={styles.actionButtonText}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9F8",
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
  },

  subtitle: {
    color: "#94A3B8",
    marginTop: 4,
  },

  activeCard: {
    marginTop: 24,
    borderRadius: 28,
    padding: 20,
    backgroundColor: "#10B981",
  },

  activeLabel: {
    color: "white",
    opacity: 0.8,
  },

  activeCount: {
    fontSize: 32,
    fontWeight: "800",
    color: "white",
    marginTop: 8,
  },

  activeDesc: {
    color: "white",
    opacity: 0.8,
    marginTop: 10,
  },

  addFriendButton: {
    marginTop: 18,
    backgroundColor: "white",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignSelf: "flex-start",
  },

  addFriendText: {
    color: "#0F172A",
    fontWeight: "700",
  },

  friendCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },

  friendTop: {
    flexDirection: "row",
    gap: 14,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: "#06B6D4",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: "white",
    fontWeight: "700",
    fontSize: 18,
  },

  friendName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },

  friendStatus: {
    marginTop: 4,
    color: "#94A3B8",
    fontSize: 14,
  },

  badgeRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    flexWrap: "wrap",
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  badgeText: {
    fontSize: 13,
    color: "#64748B",
  },

  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },

  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
  },

  actionButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
