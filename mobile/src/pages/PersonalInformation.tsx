import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardTypeOptions,
} from "react-native";

import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  getMyProfile,
  updateProfile,
  completeOnboarding,
} from "@/services/profileService";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function PersonalInformation() {
  // =========================
  // STATE QUẢN LÝ FORM PROFILE
  // Dùng để lưu dữ liệu user nhập hoặc dữ liệu load từ backend
  // =========================
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");

  const [goal, setGoal] = useState<
    "LOSE_WEIGHT" | "GAIN_MUSCLE" | "MAINTAIN" | "EAT_HEALTHIER"
  >("LOSE_WEIGHT");

  const [activityLevel, setActivityLevel] = useState<
    "SEDENTARY" | "LIGHTLY_ACTIVE" | "MODERATELY_ACTIVE" | "VERY_ACTIVE"
  >("MODERATELY_ACTIVE");

  // Khi màn hình mở lần đầu:
  // - nếu user đã có profile -> load dữ liệu cũ lên form
  // - nếu chưa có -> giữ form trống để nhập mới
  useEffect(() => {
    loadProfile();
  }, []);

  // Hàm gọi API lấy profile hiện tại từ backend
  // Nếu user đã setup trước đó thì fill dữ liệu vào form
  // Nếu chưa setup thì backend trả 404
  const loadProfile = async () => {
    try {
      const profile = await getMyProfile();

      // nếu user đã setup trước đó -> fill dữ liệu cũ
      setAge(String(profile.age));
      setGender(profile.gender);
      setHeight(String(profile.height_cm));
      setWeight(String(profile.weight_kg));
      setGoal(profile.goal);
      setActivityLevel(profile.activity_level);
    } catch (error: any) {
      // nếu chưa có profile (404)
      // giữ form mặc định để user nhập lần đầu
      if (error?.status === 404) {
        console.log("Profile chưa tồn tại -> dùng form mặc định");
        return;
      }

      console.log("LOAD PROFILE ERROR:", error);
    }
  };

  // Kiểm tra dữ liệu trước khi submit:
  // tránh trường hợp user để trống
  // giúp giảm lỗi gửi request sai lên backend
  const validate = () => {
    if (!age || !height || !weight) {
      Alert.alert("Validation Error", "Please fill all required fields");
      return false;
    }

    return true;
  };

  // Xử lý quay lại:
  // nếu có màn trước thì back
  // nếu không có (ví dụ mở trực tiếp) thì về Home
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/home");
    }
  };

  // Hàm xử lý khi user nhấn nút Save
  // Nhiệm vụ:
  // 1. Validate dữ liệu form trước khi gửi
  // 2. Nếu profile đã tồn tại -> update
  // 3. Nếu profile chưa tồn tại -> tạo mới bằng onboarding
  // 4. Sau khi lưu thành công -> cập nhật AsyncStorage để UI Profile reload ngay
  const handleSave = async () => {
    // Nếu dữ liệu không hợp lệ thì dừng luôn
    if (!validate()) return;

    try {
      // Tạo payload gửi lên backend
      // Chuyển các field nhập từ string -> number cho đúng schema API
      const payload = {
        age: Number(age),
        gender,
        height_cm: Number(height),
        weight_kg: Number(weight),
        goal,
        activity_level: activityLevel,
      };

      try {
        // =========================
        // CASE 1: User đã có profile
        // -> gọi API update profile
        // =========================
        const updatedProfile = await updateProfile(payload);

        // Lấy cache cũ trong máy
        // để merge lại tránh mất dữ liệu khác (name, email, avatar...)
        const oldCache = await AsyncStorage.getItem("nutrimind_profile_cache");

        // Parse cache cũ nếu có
        const parsedCache = oldCache ? JSON.parse(oldCache) : {};

        // Lưu cache mới sau khi update
        // giúp màn Profile reload dữ liệu mới ngay
        await AsyncStorage.setItem(
          "nutrimind_profile_cache",
          JSON.stringify({
            ...parsedCache, // giữ lại dữ liệu cũ
            age: updatedProfile.age?.toString(),
            gender: updatedProfile.gender,
            height: updatedProfile.height_cm?.toString(),
            weight: updatedProfile.weight_kg?.toString(),
            goal: updatedProfile.goal,
          }),
        );
      } catch (error: any) {
        // =========================
        // CASE 2: User chưa có profile
        // backend trả 404
        // -> tạo profile mới bằng onboarding
        // =========================
        if (error?.status === 404) {
          const createdProfile = await completeOnboarding(payload);

          // Sau khi tạo thành công:
          // lưu full profile vào cache local
          // để các màn khác (Profile, Home...) dùng ngay
          await AsyncStorage.setItem(
            "nutrimind_profile_cache",
            JSON.stringify({
              fullName: createdProfile.display_name ?? "",
              email: createdProfile.email ?? "",
              age: createdProfile.age?.toString() ?? "",
              gender: createdProfile.gender ?? "",
              height: createdProfile.height_cm?.toString() ?? "",
              weight: createdProfile.weight_kg?.toString() ?? "",
              goal: createdProfile.goal ?? "",
              photoUrl: createdProfile.avatar_url,
              waterTargetMl: createdProfile.water_target_ml,
            }),
          );
        } else {
          // Nếu lỗi không phải 404
          // throw ra catch ngoài để xử lý chung
          throw error;
        }
      }

      // Debug payload cuối cùng đã gửi
      console.log("FINAL PAYLOAD:", payload);

      // Hiển thị thông báo thành công
      // User bấm OK sẽ quay về màn trước
      Alert.alert("Success", "Profile saved successfully", [
        {
          text: "OK",
          onPress: handleBack,
        },
      ]);
    } catch (error) {
      // Log lỗi đầy đủ để debug
      console.log("SAVE PROFILE ERROR FULL:", JSON.stringify(error, null, 2));

      // Thông báo lỗi cho user
      Alert.alert("Error", "Cannot save profile");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ScrollView để toàn bộ form có thể cuộn nếu nội dung dài */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* =========================================
          HEADER
          - nút back để quay về màn trước
          - tiêu đề màn hình
      ========================================= */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={handleBack}>
            <ChevronLeft size={22} color="#0F172A" />
          </Pressable>

          <Text style={styles.title}>Personal Information</Text>
        </View>

        {/* =========================================
          AGE INPUT
          - nhập tuổi user
      ========================================= */}
        <InputField
          label="Age"
          placeholder="Ex: 21"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
        />

        {/* =========================================
          GENDER SELECT
          - chọn giới tính
      ========================================= */}
        <OptionGroup
          label="Gender"
          options={["MALE", "FEMALE"]}
          selected={gender}
          onSelect={(value) => setGender(value as "MALE" | "FEMALE")}
        />

        {/* =========================================
          HEIGHT INPUT
          - nhập chiều cao
      ========================================= */}
        <InputField
          label="Height (cm)"
          placeholder="Ex: 175"
          value={height}
          onChangeText={setHeight}
          keyboardType="numeric"
        />

        {/* =========================================
          WEIGHT INPUT
          - nhập cân nặng
      ========================================= */}
        <InputField
          label="Weight (kg)"
          placeholder="Ex: 68"
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
        />

        {/* =========================================
          GOAL SELECT
          - chọn mục tiêu sức khỏe
      ========================================= */}
        <OptionGroup
          label="Goal"
          options={["LOSE_WEIGHT", "GAIN_MUSCLE", "MAINTAIN", "EAT_HEALTHIER"]}
          selected={goal}
          onSelect={(value) =>
            setGoal(
              value as
                | "LOSE_WEIGHT"
                | "GAIN_MUSCLE"
                | "MAINTAIN"
                | "EAT_HEALTHIER",
            )
          }
        />

        {/* =========================================
          ACTIVITY LEVEL SELECT
          - mức độ hoạt động hằng ngày
      ========================================= */}
        <OptionGroup
          label="Activity Level"
          options={[
            "SEDENTARY",
            "LIGHTLY_ACTIVE",
            "MODERATELY_ACTIVE",
            "VERY_ACTIVE",
          ]}
          selected={activityLevel}
          onSelect={(value) =>
            setActivityLevel(
              value as
                | "SEDENTARY"
                | "LIGHTLY_ACTIVE"
                | "MODERATELY_ACTIVE"
                | "VERY_ACTIVE",
            )
          }
        />

        {/* =========================================
          SAVE BUTTON
          - lưu hoặc update profile
      ========================================= */}
        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveText}>Save Changes</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =======================================================
   COMPONENT INPUT DÙNG CHUNG
   Dùng cho:
   - Age
   - Height
   - Weight
======================================================= */
function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
}) {
  return (
    <View style={styles.inputWrapper}>
      {/* Tên field */}
      <Text style={styles.label}>{label}</Text>

      {/* Ô nhập dữ liệu */}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        style={styles.input}
      />
    </View>
  );
}

/* =======================================================
   COMPONENT OPTION GROUP DÙNG CHUNG
   Dùng cho:
   - Gender
   - Goal
   - Activity Level
======================================================= */
function OptionGroup({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.inputWrapper}>
      {/* Tên nhóm option */}
      <Text style={styles.label}>{label}</Text>

      {/* Render danh sách nút */}
      <View style={styles.optionWrap}>
        {options.map((item) => (
          <Pressable
            key={item}
            style={[
              styles.optionBtn,
              selected === item && styles.optionBtnActive,
            ]}
            onPress={() => onSelect(item)}
          >
            <Text
              style={[
                styles.optionText,
                selected === item && styles.optionTextActive,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9F8",
    paddingHorizontal: 24,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
    marginTop: 10,
  },

  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    marginLeft: 16,
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
  },

  inputWrapper: {
    marginBottom: 20,
  },

  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },

  input: {
    height: 58,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 18,
    fontSize: 15,
    color: "#0F172A",
  },

  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  optionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  optionBtnActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },

  optionText: {
    color: "#64748B",
    fontWeight: "600",
    fontSize: 13,
  },

  optionTextActive: {
    color: "#FFFFFF",
  },

  saveBtn: {
    height: 58,
    borderRadius: 999,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 120,
  },

  saveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
