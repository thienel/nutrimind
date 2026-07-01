import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import LogoutModal from "@/components/LogoutModal";
import { StaleDataBanner } from "@/components/StaleDataBanner";
import { OfflineBanner } from "@/components/OfflineBanner";

import { router, useFocusEffect } from "expo-router";

import { useState, useCallback, useRef } from "react";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  Activity,
  Bell,
  ChevronRight,
  CircleHelp,
  Info,
  LogOut,
  RefreshCcw,
  Scale,
  Target,
  UserRound,
} from "lucide-react-native";

import { useOfflineProfile } from "@/hooks/useOfflineProfile";
import { useAuth } from "@/context/AuthContext";

// =======================================================
// Danh sách màu avatar random
// Dùng để tạo avatar chữ cái đầu giống Friends page
// =======================================================
const avatarColors = ["#06B6D4", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"];

export function Profile() {
  // lấy thông tin auth và hàm logout
  const { signOut, user, isHydrated } = useAuth();

  // hook lấy profile từ cache hoặc server
  const { profile, isStale, lastUpdated, refresh } = useOfflineProfile();

  // state bật/tắt modal logout
  const [showLogout, setShowLogout] = useState(false);
  const mountedRef = useRef(true);

  // =======================================================
  // useFocusEffect:
  // Mỗi lần user quay lại màn Profile (focus lại)
  // sẽ tự động fetch lại profile mới nhất
  //
  // Mục đích:
  // - cập nhật goal sau khi edit Personal Information
  // - cập nhật weight mới sau khi log weight
  // - sync profile mới nhất từ server
  // - tránh phải reload app thủ công
  // =======================================================
  useFocusEffect(
    useCallback(() => {
      // Đánh dấu component đang active
      mountedRef.current = true;

      // Auth gate:
      // Chỉ cho phép fetch khi auth đã hydrate xong
      // và user đã tồn tại
      if (!isHydrated || !user?.id) {
        console.warn("[Profile] refresh skipped — auth not ready");
        return;
      }

      // Nếu component đã unmount thì dừng luôn
      if (!mountedRef.current) return;

      // Gọi refresh profile mới nhất từ server
      refresh();

      // Cleanup khi user rời màn Profile
      return () => {
        mountedRef.current = false;
      };
    }, [refresh, isHydrated, user?.id]),
  );

  // =======================================================
  // Dữ liệu hiển thị trên UI Profile
  //
  // Ưu tiên:
  // 1. profile state (data mới từ server)
  // 2. fallback auth user (data login cache)
  // 3. fallback text mặc định nếu thiếu
  // =======================================================
  const displayProfile = {
    fullName: profile?.fullName || user?.display_name || "—",
    email: profile?.email || user?.email || "—",
    age: profile?.age || "—",
    gender: profile?.gender || "—",
    height: profile?.height || "—",
    weight: profile?.weight || "—",
    goal: profile?.goal || "MAINTAIN",
  };

  // =======================================================
  // Tạo màu avatar dựa trên user id
  //
  // Mục đích:
  // - cùng 1 user luôn có cùng màu
  // - tránh random mỗi lần render
  // =======================================================
  const avatarColor = avatarColors[(user?.id ?? 0) % avatarColors.length];

  // =======================================================
  // Convert goal enum từ backend thành text dễ đọc cho UI
  //
  // Backend:
  // LOSE_WEIGHT / GAIN_MUSCLE / MAINTAIN / EAT_HEALTHIER
  //
  // UI:
  // câu mô tả thân thiện hơn
  // =======================================================
  const getGoalText = () => {
    const goalMap: Record<string, string> = {
      LOSE_WEIGHT: "Lose weight & stay lean",
      GAIN_MUSCLE: "Build muscle stronger",
      MAINTAIN: "Maintain current body",
      EAT_HEALTHIER: "Improve eating habits",
    };

    // Nếu backend trả goal lạ thì fallback
    return goalMap[displayProfile.goal] || "Stay healthy";
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Banner báo offline */}
      <OfflineBanner pushContent />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Nếu đang dùng cache cũ thì hiện cảnh báo stale */}
        {isStale && (
          <View style={{ paddingTop: 8 }}>
            <StaleDataBanner lastUpdated={lastUpdated} />
          </View>
        )}

        {/* Header */}
        <View>
          <Text style={styles.title}>My Profile</Text>
          <Text style={styles.subtitle}>Manage your health profile</Text>
        </View>

        {/* =======================================================
            Avatar dạng chữ cái đầu
        ======================================================= */}
        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>
              {displayProfile.fullName.charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.name}>{displayProfile.fullName}</Text>
          <Text style={styles.email}>{displayProfile.email}</Text>
        </View>

        {/* =======================================================
            Goal Card
            Hiển thị mục tiêu hiện tại của user
        ======================================================= */}
        <View style={styles.goalCard}>
          <Text style={styles.goalLabel}>My Goals</Text>

          <View style={styles.goalRow}>
            <View style={styles.goalLeft}>
              <View style={styles.goalIcon}>
                <Target size={22} color="#10B981" />
              </View>

              <View>
                <Text style={styles.goalTitle}>{getGoalText()}</Text>

                <Text style={styles.goalDesc}>
                  Current Weight: {displayProfile.weight} kg
                </Text>
              </View>
            </View>

            <ChevronRight size={18} color="#CBD5E1" />
          </View>
        </View>

        {/* =======================================================
            Menu actions
        ======================================================= */}
        <View style={styles.menuCard}>
          {/* Chỉnh sửa thông tin cá nhân */}
          <MenuItem
            icon={UserRound}
            title="Personal Information"
            onPress={() => router.push("/personal-information")}
          />

          {/* Xem tổng quan sức khỏe */}
          <MenuItem
            icon={Activity}
            title="Health Summary"
            onPress={() => router.push("/health-summary")}
          />

          {/* Theo dõi cân nặng */}
          <MenuItem
            icon={Scale}
            title="Weight Tracking"
            onPress={() => router.push("/weight")}
          />

          {/* Sync trạng thái đồng bộ */}
          <MenuItem
            icon={RefreshCcw}
            title="Sync Status"
            onPress={() => router.push("/sync-status")}
          />

          {/* Nhắc nhở thông minh */}
          <MenuItem icon={Bell} title="Smart Reminders" />

          {/* Hỗ trợ */}
          <MenuItem icon={CircleHelp} title="Help & Support" />

          {/* Giới thiệu app */}
          <MenuItem icon={Info} title="About NutriMind" isLast />
        </View>

        {/* Logout button */}
        <Pressable style={styles.logoutBtn} onPress={() => setShowLogout(true)}>
          <LogOut size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        {/* Modal xác nhận logout */}
        <LogoutModal
          visible={showLogout}
          onClose={() => setShowLogout(false)}
          onLogout={async () => {
            setShowLogout(false);
            await signOut();
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ icon: Icon, title, onPress, isLast }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.menuItem, !isLast && styles.menuItemBorder]}
    >
      <View style={styles.menuLeft}>
        <View style={styles.menuIcon}>
          <Icon size={20} color="#64748B" />
        </View>

        <Text style={styles.menuTitle}>{title}</Text>
      </View>

      <ChevronRight size={18} color="#CBD5E1" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9F8",
    paddingHorizontal: 24,
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
  },

  subtitle: {
    marginTop: 4,
    color: "#64748B",
  },

  profileSection: {
    alignItems: "center",
    marginTop: 30,
  },

  avatar: {
    width: 102,
    height: 102,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 38,
  },

  name: {
    marginTop: 18,
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
  },

  email: {
    marginTop: 6,
    color: "#64748B",
  },

  goalCard: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 20,
    marginTop: 24,
  },

  goalLabel: {
    color: "#94A3B8",
    fontSize: 13,
  },

  goalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },

  goalLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  goalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  goalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },

  goalDesc: {
    color: "#64748B",
    marginTop: 4,
  },

  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 28,
    marginTop: 18,
    overflow: "hidden",
  },

  menuItem: {
    height: 74,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  menuTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#0F172A",
  },

  logoutBtn: {
    height: 58,
    borderRadius: 999,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 120,
  },

  logoutText: {
    marginLeft: 8,
    color: "#EF4444",
    fontWeight: "700",
  },
});
