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

const avatarColors = ["#10B981", "#06B6D4", "#F59E0B", "#8B5CF6", "#EF4444"];

/**
 * Hàm convert friendship_status từ backend
 * thành text hiển thị cho user
 */
const getStatusText = (status: string) => {
  switch (status) {
    // đã là bạn bè
    case "friends":
      return "Already in your circle 🌱";

    // đã gửi request, đang chờ đối phương accept
    case "pending_sent":
      return "Waiting for response ⏳";

    // người kia đã gửi request cho mình trước
    case "pending_received":
      return "Sent you a request 👋";

    // chưa có quan hệ gì
    default:
      return "Ready to connect ✨";
  }
};

export default function AddFriend() {
  /**
   * keyword:
   * lưu nội dung user nhập vào ô search
   */
  const [keyword, setKeyword] = useState("");

  /**
   * users:
   * lưu kết quả tìm kiếm user từ backend
   */
  const [users, setUsers] = useState<FriendSearchItem[]>([]);

  /**
   * loading:
   * dùng để show spinner khi đang search
   */
  const [loading, setLoading] = useState(false);

  /**
   * Search user theo keyword
   *
   * Flow:
   * 1. check input rỗng
   * 2. bật loading
   * 3. gọi API search
   * 4. update danh sách users
   * 5. tắt loading
   */
  const handleSearch = async () => {
    try {
      // nếu input rỗng thì không search
      if (!keyword.trim()) return;

      // bật loading trước khi gọi API
      setLoading(true);

      // gọi API search
      const res = await searchUsers(keyword);

      // set kết quả vào state
      // nếu backend không trả items thì fallback []
      setUsers(res.items || []);
    } catch (err) {
      // log lỗi để debug
      console.log("SEARCH ERROR:", err);

      // báo lỗi cho user
      Alert.alert("Error", "Cannot search users");
    } finally {
      // luôn tắt loading dù thành công hay fail
      setLoading(false);
    }
  };

  /**
   * Gửi lời mời kết bạn
   *
   * @param id user_id của người muốn add
   *
   * Flow:
   * 1. gọi API send request
   * 2. hiện thông báo thành công
   * 3. update local state để đổi status
   */
  const handleAdd = async (id: number) => {
    try {
      // gọi API gửi request
      await sendFriendRequest(id);

      // thông báo thành công
      Alert.alert("Success", "Friend request sent 🎉");

      /**
       * update local state ngay để UI đổi luôn
       * không cần gọi search lại
       *
       * tìm đúng user vừa add
       * đổi friendship_status thành pending_sent
       */
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === id
            ? {
                ...u,
                friendship_status: "pending_sent",
              }
            : u,
        ),
      );
    } catch (err) {
      // log lỗi debug
      console.log("ADD ERROR:", err);

      // báo lỗi cho user
      Alert.alert("Error", "Cannot send request");
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
            <Text style={styles.title}>Add Friends</Text>
            <Text style={styles.subtitle}>
              Build your healthy support circle 🌱
            </Text>
          </View>
        </View>

        {/* SEARCH */}
        <View style={styles.searchBox}>
          <Search size={18} color="#94A3B8" />

          <TextInput
            placeholder="Search by name"
            style={styles.input}
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={handleSearch}
          />
        </View>

        <Pressable style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>
            {loading ? "Searching..." : "Find Friends"}
          </Text>
        </Pressable>

        {/* RESULTS */}
        <Text style={styles.sectionTitle}>People</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#10B981" />
        ) : users.length === 0 ? (
          <Text style={styles.emptyText}>Search someone to connect ✨</Text>
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
  const color = avatarColors[user.user_id % avatarColors.length];

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>
            {user.display_name.charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user.display_name}</Text>

          <Text style={styles.subText}>
            {getStatusText(user.friendship_status)}
          </Text>
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
  if (status === "friends") {
    return (
      <View style={styles.addedBtn}>
        <Check size={16} color="#10B981" />
        <Text style={styles.addedText}>Friends</Text>
      </View>
    );
  }

  if (status === "pending_sent") {
    return (
      <View style={styles.pendingBtn}>
        <Clock3 size={16} color="#F59E0B" />
        <Text style={styles.pendingText}>Pending</Text>
      </View>
    );
  }

  if (status === "pending_received") {
    return (
      <View style={styles.requestBtn}>
        <Clock3 size={16} color="#3B82F6" />
        <Text style={styles.requestText}>Requested</Text>
      </View>
    );
  }

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
    color: "#0F172A",
  },

  subtitle: {
    color: "#94A3B8",
    marginTop: 4,
  },

  searchBox: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 58,
  },

  input: {
    flex: 1,
    marginLeft: 12,
  },

  searchBtn: {
    marginTop: 14,
    backgroundColor: "#10B981",
    height: 52,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  searchBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 15,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginVertical: 22,
  },

  emptyText: {
    textAlign: "center",
    color: "#94A3B8",
    marginTop: 30,
  },

  card: {
    backgroundColor: "white",
    borderRadius: 26,
    padding: 18,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 999,
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
    fontSize: 16,
    color: "#0F172A",
  },

  subText: {
    color: "#94A3B8",
    marginTop: 4,
    fontSize: 13,
  },

  addBtn: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#10B981",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
  },

  addBtnText: {
    color: "white",
    fontWeight: "700",
  },

  addedBtn: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  addedText: {
    color: "#10B981",
    fontWeight: "700",
  },

  pendingBtn: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#FEF3C7",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  pendingText: {
    fontWeight: "700",
    color: "#D97706",
  },

  requestBtn: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#DBEAFE",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  requestText: {
    fontWeight: "700",
    color: "#2563EB",
  },
});
