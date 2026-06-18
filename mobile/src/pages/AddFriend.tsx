import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
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

import {
  searchUsers,
  sendFriendRequest,
  FriendSearchItem,
} from "@/services/friendService";

export default function AddFriend() {
  const [keyword, setKeyword] = useState("");
  const [users, setUsers] = useState<FriendSearchItem[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    try {
      if (!keyword.trim()) return;

      setLoading(true);

      const res = await searchUsers(keyword);

      setUsers(res.items || []);
    } catch (err) {
      console.log("SEARCH ERROR:", err);
      Alert.alert("Error", "Cannot search users");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (id: number) => {
    try {
      await sendFriendRequest(id);

      Alert.alert("Success", "Friend request sent");

      // update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === id ? { ...u, friendship_status: "pending_sent" } : u,
        ),
      );
    } catch (err) {
      console.log("ADD ERROR:", err);
      Alert.alert("Error", "Cannot send friend request");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={22} />
          </Pressable>

          <View>
            <Text style={styles.title}>Add Friend</Text>
            <Text style={styles.subtitle}>Stay healthy together 💪</Text>
          </View>
        </View>

        {/* SEARCH BOX */}
        <View style={styles.searchBox}>
          <Search size={18} color="#94A3B8" />

          <TextInput
            placeholder="Search by name or email"
            style={styles.input}
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={handleSearch}
          />
        </View>

        {/* SEARCH BUTTON */}
        <Pressable style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>
            {loading ? "Searching..." : "Search"}
          </Text>
        </Pressable>

        {/* RESULTS */}
        <Text style={styles.sectionTitle}>Suggested Friends</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#10B981" />
        ) : users.length === 0 ? (
          <Text style={styles.emptyText}>No result found</Text>
        ) : (
          users.map((user) => (
            <FriendCard
              key={user.user_id}
              user={user}
              onAdd={() => handleAdd(user.user_id)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FriendCard({
  user,
  onAdd,
}: {
  user: FriendSearchItem;
  onAdd: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.display_name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View>
          <Text style={styles.name}>{user.display_name}</Text>

          <Text style={styles.email}>{user.email || "No email available"}</Text>
        </View>
      </View>

      <ActionButton status={user.friendship_status} onPress={onAdd} />
    </View>
  );
}

function ActionButton({
  status,
  onPress,
}: {
  status: string;
  onPress: () => void;
}) {
  // đã là bạn
  if (status === "friends") {
    return (
      <View style={styles.addedBtn}>
        <Check size={16} color="#10B981" />
        <Text style={styles.addedText}>Friends</Text>
      </View>
    );
  }

  // đã gửi request
  if (status === "pending_sent") {
    return (
      <View style={styles.pendingBtn}>
        <Clock3 size={16} color="#F59E0B" />
        <Text style={styles.pendingText}>Pending</Text>
      </View>
    );
  }

  // người kia gửi mình trước
  if (status === "pending_received") {
    return (
      <View style={styles.pendingBtn}>
        <Clock3 size={16} color="#3B82F6" />
        <Text style={styles.pendingText}>Requested</Text>
      </View>
    );
  }

  // chưa kết bạn
  return (
    <Pressable style={styles.addBtn} onPress={onPress}>
      <UserPlus size={16} color="white" />
      <Text style={styles.addBtnText}>Add</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9F8",
    padding: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },

  backBtn: {
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
  },

  subtitle: {
    color: "#94A3B8",
    marginTop: 4,
  },

  searchBox: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 56,
  },

  input: {
    flex: 1,
    marginLeft: 12,
  },

  searchBtn: {
    marginTop: 12,
    backgroundColor: "#0F172A",
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  searchBtnText: {
    color: "white",
    fontWeight: "700",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginVertical: 20,
  },

  emptyText: {
    textAlign: "center",
    color: "#94A3B8",
    marginTop: 20,
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

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: "white",
    fontWeight: "700",
    fontSize: 18,
  },

  name: {
    fontWeight: "700",
    fontSize: 15,
  },

  email: {
    color: "#94A3B8",
    marginTop: 4,
    fontSize: 13,
  },

  addBtn: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#0F172A",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },

  addBtnText: {
    color: "white",
    fontWeight: "600",
  },

  addedBtn: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },

  addedText: {
    color: "#10B981",
    fontWeight: "600",
  },

  pendingBtn: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#FFFBEB",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },

  pendingText: {
    fontWeight: "600",
    color: "#F59E0B",
  },
});
