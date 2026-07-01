import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { completeOnboarding, getMyProfile } from "@/services/profileService";

export function HealthSetup() {
  // =======================================================
  // Goal người dùng chọn
  // Phải match đúng enum backend để submit onboarding
  // =======================================================
  const [goal, setGoal] = useState<"LOSE_WEIGHT" | "GAIN_MUSCLE" | "MAINTAIN">(
    "LOSE_WEIGHT",
  );

  // =======================================================
  // Mức độ vận động của user
  // Cũng phải đúng format backend yêu cầu
  // =======================================================
  const [activity, setActivity] = useState<
    "SEDENTARY" | "MODERATELY_ACTIVE" | "VERY_ACTIVE"
  >("MODERATELY_ACTIVE");

  // =======================================================
  // Submit toàn bộ onboarding
  // Đây là bước cuối cùng sau khi user hoàn thành setup
  // =======================================================
  const handleFinish = async () => {
    try {
      // Lấy dữ liệu step 1 đã lưu local trước đó
      // (age, gender, height, weight)
      const saved = await AsyncStorage.getItem("onboarding_step_1");

      // Nếu không có dữ liệu thì không thể submit
      if (!saved) {
        Alert.alert("Error", "Missing step 1 data");
        return;
      }

      // Parse dữ liệu local thành object
      const step1 = JSON.parse(saved);

      // =======================================================
      // Gửi onboarding data lên backend
      // Backend sẽ tính:
      // - BMI
      // - BMR
      // - TDEE
      // - calorie target
      // - macro target
      // - water target
      // và set onboarding_done = true
      // =======================================================
      await completeOnboarding({
        age: Number(step1.age),
        gender: step1.gender,
        height_cm: Number(step1.height),
        weight_kg: Number(step1.weight),
        goal,
        activity_level: activity,
      });

      // =======================================================
      // Rule A:
      // Sau khi submit onboarding xong
      // KHÔNG navigate ngay
      //
      // Phải fetch profile lại để xác nhận:
      // onboarding_done đã thật sự commit ở backend
      //
      // Retry tối đa 3 lần vì backend có thể delay
      // =======================================================
      let freshProfile: Awaited<ReturnType<typeof getMyProfile>> | null = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          freshProfile = await getMyProfile({
            file: "HealthSetup.tsx",
            route: "handleFinish",
          });

          // Nếu backend xác nhận onboarding_done=true thì dừng retry
          if (freshProfile.onboarding_done === true) {
            break;
          }
        } catch (err) {
          console.warn(
            `[HealthSetup] Profile fetch attempt ${attempt + 1} failed:`,
            err,
          );
        }

        // Delay 500ms trước lần thử tiếp theo
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // Nếu sau 3 lần vẫn chưa confirm được onboarding
      // thì báo lỗi cho user
      if (!freshProfile || freshProfile.onboarding_done !== true) {
        Alert.alert(
          "Error",
          "Could not confirm onboarding completion. Please try again.",
        );
        return;
      }

      // =======================================================
      // Clear dữ liệu local onboarding step 1
      // vì đã submit thành công
      // =======================================================
      await AsyncStorage.removeItem("onboarding_step_1");

      // =======================================================
      // Cache profile mới nhất vào local
      // để các màn khác dùng ngay không cần fetch lại
      // (Profile screen / Home screen)
      // =======================================================
      await AsyncStorage.setItem(
        "nutrimind_profile_cache",
        JSON.stringify({
          fullName: freshProfile.display_name,
          email: freshProfile.email,
          age: freshProfile.age.toString(),
          gender: freshProfile.gender,
          height: freshProfile.height_cm.toString(),
          weight: freshProfile.weight_kg.toString(),
          goal: freshProfile.goal,
          photoUrl: freshProfile.avatar_url,
          waterTargetMl: freshProfile.water_target_ml,
        }),
      );

      // =======================================================
      // Chỉ chuyển sang Home sau khi backend confirm xong
      // Điều này tránh bug:
      // - Home fetch sớm
      // - backend chưa commit onboarding_done
      // - bị redirect về onboarding lại
      // =======================================================
      router.replace("/(tabs)/home");
    } catch (error) {
      console.log(error);

      // Catch lỗi tổng quát khi submit onboarding
      Alert.alert("Error", "Cannot complete onboarding");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Step */}
        <View style={styles.header}>
          <Text style={styles.step}>2 of 2</Text>
        </View>

        {/* Progress */}
        <View style={styles.progressBg}>
          <View style={styles.progressFull} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Your health goals</Text>
        <Text style={styles.subtitle}>Choose what fits your lifestyle.</Text>

        {/* Goal */}
        <Section title="Goal">
          <Option
            text="Lose Weight"
            active={goal === "LOSE_WEIGHT"}
            onPress={() => setGoal("LOSE_WEIGHT")}
          />

          <Option
            text="Gain Muscle"
            active={goal === "GAIN_MUSCLE"}
            onPress={() => setGoal("GAIN_MUSCLE")}
          />

          <Option
            text="Maintain"
            active={goal === "MAINTAIN"}
            onPress={() => setGoal("MAINTAIN")}
          />
        </Section>

        {/* Activity */}
        <Section title="Activity">
          <Option
            text="Sedentary"
            active={activity === "SEDENTARY"}
            onPress={() => setActivity("SEDENTARY")}
          />

          <Option
            text="Moderately Active"
            active={activity === "MODERATELY_ACTIVE"}
            onPress={() => setActivity("MODERATELY_ACTIVE")}
          />

          <Option
            text="Very Active"
            active={activity === "VERY_ACTIVE"}
            onPress={() => setActivity("VERY_ACTIVE")}
          />
        </Section>

        {/* Submit */}
        <Pressable style={styles.button} onPress={handleFinish}>
          <Text style={styles.buttonText}>Finish Setup</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// section wrapper
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 28 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

// option button
function Option({
  text,
  active,
  onPress,
}: {
  text: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.option, active && styles.activeOption]}
    >
      <Text style={[styles.optionText, active && styles.activeOptionText]}>
        {text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9F8",
    paddingHorizontal: 24,
  },

  header: {
    alignItems: "flex-end",
    marginTop: 10,
    marginBottom: 14,
  },

  step: {
    color: "#94A3B8",
  },

  progressBg: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    overflow: "hidden",
  },

  progressFull: {
    width: "100%",
    height: "100%",
    backgroundColor: "#10B981",
  },

  title: {
    marginTop: 30,
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
  },

  subtitle: {
    color: "#64748B",
    marginTop: 8,
    marginBottom: 30,
  },

  sectionTitle: {
    fontWeight: "700",
    marginBottom: 12,
    color: "#0F172A",
  },

  option: {
    height: 58,
    backgroundColor: "#fff",
    borderRadius: 22,
    justifyContent: "center",
    paddingHorizontal: 18,
    marginBottom: 12,
  },

  activeOption: {
    backgroundColor: "#10B981",
  },

  optionText: {
    color: "#0F172A",
    fontWeight: "600",
  },

  activeOptionText: {
    color: "#fff",
  },

  button: {
    height: 58,
    backgroundColor: "#10B981",
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
