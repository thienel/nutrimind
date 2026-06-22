import React, { useCallback, useState, useRef } from "react";
import { useFocusEffect, router } from "expo-router";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Flame, Droplets, WifiOff } from "lucide-react-native";

import { useNetwork } from "@/context/NetworkContext";
import { useAuth } from "@/context/AuthContext";
import { OfflineBanner } from "@/components/OfflineBanner";
import { OfflineEmptyState } from "@/components/OfflineEmptyState";

import {
  getFriends,
  sendCheer,
  respondFriendRequest,
} from "@/services/friendService";

const avatarColors = ["#06B6D4", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"];

export default function Friends() {
  // State lưu danh sách bạn bè đã accept
  const [friends, setFriends] = useState<any[]>([]);

  // State lưu danh sách lời mời kết bạn đang chờ xử lý
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  const { isOnline } = useNetwork();
  const { isHydrated, user } = useAuth();
  const mountedRef = useRef(true);

  /**
   * Hàm load lại toàn bộ danh sách bạn bè + request
   *
   * Dùng useCallback để:
   * - tránh tạo lại function mỗi lần component re-render
   * - tiện gọi lại sau khi accept/reject
   */
  const loadFriends = useCallback(async () => {
    // Auth readiness gate — block fetches until auth is fully hydrated
    if (!isHydrated || !user) {
      console.warn("[Friends] loadFriends skipped — auth not ready");
      return;
    }

    try {
      // gọi API lấy danh sách bạn bè
      const res = await getFriends();

      // cập nhật state friends
      // nếu backend không trả thì fallback []
      setFriends(res.friends || []);

      // cập nhật state pending requests
      setPendingRequests(res.pending_received || []);
    } catch (err) {
      // log lỗi nếu API fail
      console.log("GET FRIENDS ERROR:", err);
    }
  }, [isHydrated, user?.id]);

  /**
   * useFocusEffect:
   * chạy mỗi lần screen được focus (mở vào hoặc quay lại)
   *
   * Khác useEffect:
   * - useEffect chỉ chạy khi mount
   * - useFocusEffect chạy lại khi quay về màn này
   */
  useFocusEffect(
    useCallback(() => {
      // flag kiểm tra component còn active không
      // tránh lỗi setState sau khi unmount
      let isActive = true;
      mountedRef.current = true;

      const fetchData = async () => {
        // Auth readiness gate — block fetches until auth is fully hydrated
        if (!isHydrated || !user) {
          console.warn("[Friends] fetchData skipped — auth not ready");
          return;
        }

        // Mounted guard
        if (!mountedRef.current) return;

        try {
          // gọi API lấy friend list
          const res = await getFriends();

          // nếu screen đã unmount thì dừng
          if (!isActive || !mountedRef.current) return;

          // update state khi còn active
          setFriends(res.friends || []);
          setPendingRequests(res.pending_received || []);
        } catch (err) {
          if (!mountedRef.current) return;
          console.log("GET FRIENDS ERROR:", err);
        }
      };

      // chạy fetch ngay khi screen focus
      fetchData();

      /**
       * cleanup function:
       * chạy khi screen unfocus/unmount
       *
       * set false để chặn setState sau khi component đã bị destroy
       */
      return () => {
        isActive = false;
        mountedRef.current = false;
      };
    }, [isHydrated, user?.id]),
  );

  /**
   * Gửi cheer (thả động viên) cho bạn bè
   *
   * @param userId id người nhận
   * @param reaction loại reaction:
   * - keep_going
   * - nice_job
   * - great_progress
   */
  const handleCheer = async (
    userId: number,
    reaction: "keep_going" | "nice_job" | "great_progress",
  ) => {
    try {
      // log payload để debug xem gửi đúng chưa
      console.log("CHEER PAYLOAD:", {
        recipient_id: userId,
        reaction,
      });

      // gọi API gửi cheer
      const res = await sendCheer(userId, reaction);

      // log response backend trả về
      console.log("CHEER RESPONSE:", res);

      // hiện thông báo thành công
      Alert.alert("Success", "Cheer sent 🎉");
    } catch (err: any) {
      /**
       * log full lỗi:
       * ưu tiên response.data từ backend
       * nếu không có thì log object lỗi gốc
       */
      console.log(
        "CHEER ERROR FULL:",
        JSON.stringify(err?.response?.data || err, null, 2),
      );
    }
  };

  /**
   * Accept lời mời kết bạn
   *
   * Flow:
   * 1. gọi API accept
   * 2. báo thành công
   * 3. reload lại danh sách
   */
  const handleAccept = async (friendshipId: number) => {
    try {
      // gửi action accept lên backend
      await respondFriendRequest(friendshipId, "accept");

      // popup thành công
      Alert.alert("Success", "Friend request accepted 🎉");

      // load lại danh sách để cập nhật UI
      await loadFriends();
    } catch (err) {
      console.log("ACCEPT ERROR:", err);
    }
  };

  /**
   * Từ chối lời mời kết bạn
   *
   * Flow:
   * 1. gọi API decline
   * 2. báo declined
   * 3. reload lại danh sách
   */
  const handleReject = async (friendshipId: number) => {
    try {
      // gửi action decline lên backend
      await respondFriendRequest(friendshipId, "decline");

      // popup thông báo
      Alert.alert("Declined", "Friend request declined");

      // load lại danh sách
      await loadFriends();
    } catch (err) {
      console.log("DECLINE ERROR:", err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner pushContent />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={22} />
          </Pressable>

          <View style={{ marginLeft: 14 }}>
            <Text style={styles.title}>Friends Motivation</Text>
            <Text style={styles.subtitle}>Stay motivated together 💪</Text>
          </View>
        </View>

        {/* SUMMARY */}
        {!isOnline ? (
          <View style={{ flex: 1, minHeight: 500 }}>
            <OfflineEmptyState onRetry={loadFriends} />
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Your Support Circle</Text>

              <Text style={styles.summaryDesc}>
                Build healthy habits together and stay accountable.
              </Text>

              <View style={styles.statsRow}>
                <View>
                  <Text style={styles.statNumber}>{friends.length}</Text>
                  <Text style={styles.statLabel}>Friends</Text>
                </View>

                <View>
                  <Text style={styles.statNumber}>
                    {pendingRequests.length}
                  </Text>
                  <Text style={styles.statLabel}>Requests</Text>
                </View>
              </View>

              <Pressable
                style={styles.addFriendButton}
                onPress={() => router.push("/add-friend")}
              >
                <Text style={styles.addFriendText}>+ Add Friend</Text>
              </Pressable>
            </View>

            {/* PENDING */}
            {pendingRequests.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Pending Requests</Text>

                {pendingRequests.map((req) => (
                  <RequestCard
                    key={req.friendship_id}
                    request={req}
                    onAccept={() => handleAccept(req.friendship_id)}
                    onReject={() => handleReject(req.friendship_id)}
                  />
                ))}
              </>
            )}

            {/* FRIENDS */}
            <Text style={styles.sectionTitle}>My Friends</Text>

            {friends.map((friend) => (
              <FriendCard
                key={friend.user_id}
                friend={friend}
                onCheer={handleCheer}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RequestCard({ request, onAccept, onReject }: any) {
  const color = avatarColors[request.user_id % avatarColors.length];

  return (
    <View style={styles.requestCard}>
      <View style={styles.friendTop}>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>
            {request.display_name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.friendName}>{request.display_name}</Text>
          <Text style={styles.friendStatus}>Wants to connect with you 👋</Text>
        </View>
      </View>

      <View style={styles.requestActions}>
        <Pressable style={styles.rejectButton} onPress={onReject}>
          <Text style={styles.rejectButtonText}>Decline</Text>
        </Pressable>

        <Pressable style={styles.acceptButton} onPress={onAccept}>
          <Text style={styles.acceptButtonText}>Accept</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FriendCard({ friend, onCheer }: any) {
  const color = avatarColors[friend.user_id % avatarColors.length];

  return (
    <View style={styles.friendCard}>
      <View style={styles.friendTop}>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>
            {friend.display_name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.friendName}>{friend.display_name}</Text>

          <Text style={styles.friendStatus}>
            {friend.last_activity_at
              ? "Recently active 🌱"
              : "Keep each other motivated 💪"}
          </Text>

          <View style={styles.badgeRow}>
            <MiniBadge
              icon={<Droplets size={14} color="#64748B" />}
              text="Nutrition Buddy"
            />

            <MiniBadge
              icon={<Flame size={14} color="#64748B" />}
              text={`${friend.current_streak} Day Streak`}
            />
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <ActionButton
          text="💪"
          onPress={() => onCheer(friend.user_id, "keep_going")}
        />
        <ActionButton
          text="👏"
          onPress={() => onCheer(friend.user_id, "nice_job")}
        />
        <ActionButton
          text="🔥"
          onPress={() => onCheer(friend.user_id, "great_progress")}
        />
      </View>
    </View>
  );
}

function MiniBadge({ icon, text }: any) {
  return (
    <View style={styles.badge}>
      {icon}
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

function ActionButton({ text, onPress }: any) {
  return (
    <Pressable style={styles.actionButton} onPress={onPress}>
      <Text style={{ fontSize: 20 }}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9F8", paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 26, fontWeight: "800", color: "#0F172A" },
  subtitle: { color: "#94A3B8", marginTop: 4 },
  summaryCard: {
    marginTop: 24,
    borderRadius: 28,
    padding: 22,
    backgroundColor: "#10B981",
  },
  summaryTitle: { fontSize: 24, fontWeight: "800", color: "white" },
  summaryDesc: { color: "white", opacity: 0.9, marginTop: 8 },
  statsRow: { flexDirection: "row", gap: 40, marginTop: 18 },
  statNumber: { fontSize: 24, fontWeight: "800", color: "white" },
  statLabel: { color: "white", opacity: 0.8 },
  addFriendButton: {
    marginTop: 20,
    backgroundColor: "white",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignSelf: "flex-start",
  },
  addFriendText: { color: "#0F172A", fontWeight: "700" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 12,
  },
  requestCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },
  friendCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },
  friendTop: { flexDirection: "row", gap: 14 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "white", fontWeight: "700", fontSize: 18 },
  friendName: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  friendStatus: { marginTop: 4, color: "#94A3B8", fontSize: 14 },
  badgeRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  badgeText: { fontSize: 13, color: "#64748B" },
  actionRow: { flexDirection: "row", gap: 12, marginTop: 18 },
  actionButton: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  requestActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  rejectButton: {
    flex: 1,
    backgroundColor: "#FEE2E2",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  rejectButtonText: { color: "#DC2626", fontWeight: "700" },
  acceptButton: {
    flex: 1,
    backgroundColor: "#10B981",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  acceptButtonText: { color: "white", fontWeight: "700" },
  offlineContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    paddingHorizontal: 20,
  },
  offlineIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  offlineTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  offlineDesc: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },
});
