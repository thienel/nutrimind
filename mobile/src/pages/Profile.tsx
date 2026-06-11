import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import LogoutModal from "@/components/LogoutModal";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { router, useFocusEffect } from "expo-router";

import { useCallback, useState } from "react";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  Activity,
  Bell,
  ChevronRight,
  CircleHelp,
  Info,
  LogOut,
  Scale,
  Target,
  UserRound,
} from "lucide-react-native";

export function Profile() {
  // Hiển thị modal logout
  const [showLogout, setShowLogout] = useState(false);

  // Thông tin người dùng
  const [profile, setProfile] = useState({
    fullName: "Thunee0411",
    email: "you@examplemail.com",
    age: "21",
    gender: "Male",
    height: "175",
    weight: "65",
    goalWeight: "60",
  });

  // Load profile từ AsyncStorage
  const loadProfile = async () => {
    try {
      const saved = await AsyncStorage.getItem("profile");

      if (!saved) return;

      const data = JSON.parse(saved);

      setProfile({
        fullName: data.fullName || "Thunee0411",

        email: data.email || "you@examplemail.com",

        age: data.age || "21",

        gender: data.gender || "Male",

        height: data.height || "175",

        weight: data.weight || "65",

        goalWeight: data.goalWeight || "60",
      });
    } catch (error) {
      console.log("Load profile error:", error);
    }
  };

  // Mỗi lần quay lại màn Profile sẽ load dữ liệu mới nhất
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, []),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View>
          <Text style={styles.title}>My Profile</Text>

          <Text style={styles.subtitle}>Manage your health profile</Text>
        </View>

        {/* Avatar */}
        <View style={styles.profileSection}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300",
            }}
            style={styles.avatar}
          />

          <Text style={styles.name}>{profile.fullName}</Text>

          <Text style={styles.email}>{profile.email}</Text>
        </View>

        {/* Goal Card */}
        <View style={styles.goalCard}>
          <Text style={styles.goalLabel}>My Goals</Text>

          <View style={styles.goalRow}>
            <View style={styles.goalLeft}>
              <View style={styles.goalIcon}>
                <Target size={22} color="#10B981" />
              </View>

              <Text style={styles.goalTitle}>Personal Goal</Text>

              <Text style={styles.goalDesc}>
                Target Weight: {profile.goalWeight} kg
              </Text>
            </View>

            <ChevronRight size={18} color="#CBD5E1" />
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuCard}>
          <MenuItem
            icon={UserRound}
            title="Personal Information"
            onPress={() => router.push("/personal-information")}
          />

          <MenuItem
            icon={Activity}
            title="Health Profile"
            onPress={() => router.push("/health-profile")}
          />

          {/* SỬA TẠI ĐÂY: Điều hướng chính xác tới trang tổng quan sức khỏe */}
          <MenuItem
            icon={Activity}
            title="Health Summary"
            onPress={() => router.push("/health-summary")}
          />

          <MenuItem
            icon={Scale}
            title="Weight Tracking"
            onPress={() => router.push("/weight")}
          />

          <MenuItem icon={Bell} title="Smart Reminders" />

          <MenuItem icon={CircleHelp} title="Help & Support" />

          <MenuItem icon={Info} title="About NutriMind" isLast />
        </View>

        {/* Logout */}
        <Pressable style={styles.logoutBtn} onPress={() => setShowLogout(true)}>
          <LogOut size={18} color="#EF4444" />

          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
        <LogoutModal
          visible={showLogout}
          onClose={() => setShowLogout(false)}
          onLogout={() => {
            setShowLogout(false);

            router.replace("/auth");
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
    borderRadius: 51,
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