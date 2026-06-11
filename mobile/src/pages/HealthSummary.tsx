import React, { useState, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ChevronLeft,
  Scale,
  Flame,
  Activity,
  Droplets
} from "lucide-react-native";

export default function HealthSummary() {
  // State quản lý profile từ AsyncStorage để tính toán dữ liệu động
  const [profile, setProfile] = useState({
    fullName: "Thunee0411",
    age: "21",
    gender: "Male",
    height: "175",
    weight: "65",
  });

  const loadProfile = async () => {
    try {
      const saved = await AsyncStorage.getItem("profile");
      if (saved) {
        setProfile(JSON.parse(saved));
      }
    } catch (error) {
      console.log("Load profile error in Summary:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  // --- THUẬT TOÁN TỰ ĐỘNG TÍNH TOÁN THEO HÌNH ---
  const weight = parseFloat(profile.weight) || 65;
  const height = parseFloat(profile.height) || 175;
  const age = parseFloat(profile.age) || 21;
  const isMale = profile.gender?.toLowerCase() === "male";

  // 1. Tính BMI
  const bmi = (weight / ((height / 100) * (height / 100))).toFixed(1);
  const getBmiStatus = (val: number) => {
    if (val < 18.5) return "Underweight";
    if (val < 25) return "Normal";
    return "Overweight";
  };

  // 2. Tính BMR (Công thức Mifflin-St Jeor)
  const bmr = Math.round(
    isMale
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161
  );

  // 3. Tính TDEE (Mặc định vận động vừa phải x 1.375)
  const tdee = Math.round(bmr * 1.375);

  // 4. Tính Water target (35ml trên mỗi kg)
  const waterTarget = ((weight * 35) / 1000).toFixed(1);

  // 5. Thống kê dinh dưỡng mục tiêu (Giảm nhẹ calories để giữ dáng/giảm cân nhẹ)
  const dailyCalories = Math.round(tdee - 300);
  const proteinGrams = Math.round(weight * 2); // 2g trên mỗi kg tạng người tập luyện
  const fatGrams = Math.round((dailyCalories * 0.25) / 9);
  const carbsGrams = Math.round((dailyCalories - (proteinGrams * 4 + fatGrams * 9)) / 4);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header đúng chuẩn nút back tròn */}
      <View style={styles.headerContainer}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>Health{"\n"}Summary</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 4 Cards Chỉ số chính (Grid Layout) */}
        <View style={styles.gridContainer}>
          
          {/* Card BMI */}
          <View style={styles.statCard}>
            <View style={[styles.iconContainer, { backgroundColor: "#EDF9FA" }]}>
              <Scale size={24} color="#0EA5E9" />
            </View>
            <Text style={styles.cardLabel}>BMI</Text>
            <Text style={styles.cardValue}>{bmi}</Text>
            <Text style={styles.cardSubText}>{getBmiStatus(parseFloat(bmi))}</Text>
          </View>

          {/* Card BMR */}
          <View style={styles.statCard}>
            <View style={[styles.iconContainer, { backgroundColor: "#F0FDF4" }]}>
              <Flame size={24} color="#22C55E" />
            </View>
            <Text style={styles.cardLabel}>BMR</Text>
            <Text style={styles.cardValue}>{bmr.toLocaleString()}</Text>
            <Text style={styles.cardSubText}>kcal/day</Text>
          </View>

          {/* Card TDEE */}
          <View style={styles.statCard}>
            <View style={[styles.iconContainer, { backgroundColor: "#FEF2F2" }]}>
              <Activity size={24} color="#EF4444" />
            </View>
            <Text style={styles.cardLabel}>TDEE</Text>
            <Text style={styles.cardValue}>{tdee.toLocaleString()}</Text>
            <Text style={styles.cardSubText}>kcal/day</Text>
          </View>

          {/* Card Water */}
          <View style={styles.statCard}>
            <View style={[styles.iconContainer, { backgroundColor: "#EFF6FF" }]}>
              <Droplets size={24} color="#3B82F6" />
            </View>
            <Text style={styles.cardLabel}>Water</Text>
            <Text style={styles.cardValue}>{waterTarget}L</Text>
            <Text style={styles.cardSubText}>daily target</Text>
          </View>

        </View>

        {/* Box Dinh dưỡng hàng ngày lớn phía dưới */}
        <View style={styles.nutritionCard}>
          <Text style={styles.nutritionTitle}>Daily Nutrition Goal</Text>
          
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>Calories</Text>
            <Text style={styles.nutritionValue}>{dailyCalories.toLocaleString()} kcal</Text>
          </View>

          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>Protein</Text>
            <Text style={styles.nutritionValue}>{proteinGrams}g</Text>
          </View>

          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>Carbs</Text>
            <Text style={styles.nutritionValue}>{carbsGrams}g</Text>
          </View>

          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>Fat</Text>
            <Text style={styles.nutritionValue}>{fatGrams}g</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAF9", // Nền xám nhạt nhẹ chuẩn UI sạch
  },
  headerContainer: {
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    // Tạo bóng đổ nhẹ cho nút back
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#0B1A30",
    marginTop: 24,
    lineHeight: 40,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 140, // Chừa khoảng trống rộng rãi cho thanh Bottom Tab dưới cùng
    paddingTop: 16,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "47%", // Bo vừa vặn 2 cột cân đối kèm khoảng cách giữa
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    marginBottom: 20,
    // Shadow mềm mại chuẩn thiết kế mới
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 12,
    elevation: 3,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#94A3B8",
  },
  cardValue: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 6,
  },
  cardSubText: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 4,
    fontWeight: "500",
  },
  nutritionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 12,
    elevation: 3,
  },
  nutritionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0B1A30",
    marginBottom: 16,
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC", // Đường gạch ngang mờ thanh lịch giữa các dòng
  },
  nutritionLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#94A3B8",
  },
  nutritionValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
});