import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CircleCheck, Target } from "lucide-react-native";

import { getMyProfile } from "@/services/profileService";

type PlanData = {
  calorie_target: number;
  water_target_ml: number;
};

export function FirstWeekPlan() {
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);

  // fetch profile khi mở màn
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await getMyProfile({
          file: "FirstWeekPlan.tsx",
          route: "loadPlan",
        });

        if (!cancelled) {
          setPlan({
            calorie_target: res.calorie_target,
            water_target_ml: res.water_target_ml,
          });
        }
      } catch (error) {
        if (!cancelled) {
          console.log("Lỗi fetch profile:", error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  // loading
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* icon */}
        <View style={styles.iconCircle}>
          <Target size={56} color="#10B981" />
        </View>

        {/* tiêu đề */}
        <Text style={styles.title}>Your First Week Plan</Text>

        <Text style={styles.subtitle}>
          Follow these daily habits to achieve your goal.
        </Text>

        {/* plan card */}
        <View style={styles.card}>
          {/* water target từ backend */}
          <PlanItem
            text={`Drink ${(plan?.water_target_ml ?? 0) / 1000}L water every day`}
          />

          {/* calorie target từ backend */}
          <PlanItem
            text={`Stay under ${Math.round(plan?.calorie_target ?? 0)} kcal/day`}
          />

          {/* hardcode thêm */}
          <PlanItem text="Log at least 3 meals daily" />
          <PlanItem text="Walk 8,000 steps daily" />
          <PlanItem text="Update weight every Sunday" />
        </View>
      </View>

      {/* nút vào home */}
      <Pressable style={styles.button} onPress={() => router.replace("/home")}>
        <Text style={styles.buttonText}>Start My Journey</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function PlanItem({ text }: { text: string }) {
  return (
    <View style={styles.planRow}>
      <CircleCheck size={20} color="#10B981" />
      <Text style={styles.planText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9F8",
    paddingHorizontal: 24,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  content: {
    flex: 1,
    justifyContent: "center",
  },

  iconCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },

  title: {
    textAlign: "center",
    marginTop: 30,
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
  },

  subtitle: {
    textAlign: "center",
    marginTop: 10,
    color: "#64748B",
    lineHeight: 24,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 22,
    marginTop: 30,
  },

  planRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  planText: {
    marginLeft: 12,
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "500",
  },

  button: {
    height: 58,
    borderRadius: 999,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
