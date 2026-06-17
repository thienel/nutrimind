import React from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  ChevronLeft,
  Search,
  UserPlus,
  Check,
  Clock3,
} from "lucide-react-native";

/**
 * Mock data danh sách gợi ý kết bạn
 */
const friends = [
  {
    id: 1,
    name: "Linh_0411",
    username: "@linhfit",
    status: "add",
  },
  {
    id: 2,
    name: "MinhGym",
    username: "@proteinminh",
    status: "pending",
  },
  {
    id: 3,
    name: "HealthyAn",
    username: "@healthyan",
    status: "added",
  },
  {
    id: 4,
    name: "FitTrang",
    username: "@fittrang",
    status: "add",
  },
];

export default function AddFriend() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={22} />
          </Pressable>

          <View>
            <Text style={styles.title}>Add Friend</Text>
            <Text style={styles.subtitle}>Stay healthy together 💪</Text>
          </View>
        </View>

        {/* Search box */}
        <View style={styles.searchBox}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            placeholder="Search username or email"
            style={styles.input}
          />
        </View>

        {/* Suggested list */}
        <Text style={styles.sectionTitle}>Suggested Friends</Text>

        {friends.map((friend) => (
          <FriendCard key={friend.id} {...friend} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function FriendCard({ name, username, status }: any) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0)}</Text>
        </View>

        <View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.username}>{username}</Text>
        </View>
      </View>

      <ActionButton status={status} />
    </View>
  );
}

function ActionButton({ status }: { status: string }) {
  if (status === "added") {
    return (
      <View style={styles.addedBtn}>
        <Check size={16} color="#10B981" />
        <Text>Added</Text>
      </View>
    );
  }

  if (status === "pending") {
    return (
      <View style={styles.pendingBtn}>
        <Clock3 size={16} color="#F59E0B" />
        <Text>Pending</Text>
      </View>
    );
  }

  return (
    <Pressable style={styles.addBtn}>
      <UserPlus size={16} color="white" />
      <Text style={{ color: "white" }}>Add</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9F8", padding: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 16 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 26, fontWeight: "800" },
  subtitle: { color: "#94A3B8", marginTop: 4 },
  searchBox: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 56,
  },
  input: { flex: 1, marginLeft: 12 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginVertical: 20,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "white", fontWeight: "700" },
  name: { fontWeight: "700" },
  username: { color: "#94A3B8", marginTop: 4 },
  addBtn: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#0F172A",
    padding: 12,
    borderRadius: 16,
  },
  addedBtn: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#ECFDF5",
    padding: 12,
    borderRadius: 16,
  },
  pendingBtn: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#FFFBEB",
    padding: 12,
    borderRadius: 16,
  },
});
