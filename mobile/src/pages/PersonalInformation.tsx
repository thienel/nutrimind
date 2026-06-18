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

import { getMyProfile, updateProfile } from "@/services/profileService";

export function PersonalInformation() {
  // state profile
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

  // fetch profile khi mở màn
  useEffect(() => {
    loadProfile();
  }, []);

  // lấy profile từ backend
  const loadProfile = async () => {
    try {
      const profile = await getMyProfile();

      setAge(String(profile.age));
      setGender(profile.gender);
      setHeight(String(profile.height_cm));
      setWeight(String(profile.weight_kg));
      setGoal(profile.goal);
      setActivityLevel(profile.activity_level);
    } catch (error) {
      console.log(error);
    }
  };

  // validate dữ liệu
  const validate = () => {
    if (!age || !height || !weight) {
      Alert.alert("Validation Error", "Please fill all required fields");
      return false;
    }

    return true;
  };

  // update profile
  const handleSave = async () => {
    if (!validate()) return;

    try {
      await updateProfile({
        age: Number(age),
        gender,
        height_cm: Number(height),
        weight_kg: Number(weight),
        goal,
        activity_level: activityLevel,
      });

      Alert.alert("Success", "Profile updated successfully", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Cannot update profile");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={22} color="#0F172A" />
          </Pressable>

          <Text style={styles.title}>Personal Information</Text>
        </View>

        {/* Age */}
        <InputField
          label="Age"
          placeholder="Ex: 21"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
        />

        {/* Gender */}
        <OptionGroup
          label="Gender"
          options={["MALE", "FEMALE"]}
          selected={gender}
          onSelect={(value) => setGender(value as "MALE" | "FEMALE")}
        />

        {/* Height */}
        <InputField
          label="Height (cm)"
          placeholder="Ex: 175"
          value={height}
          onChangeText={setHeight}
          keyboardType="numeric"
        />

        {/* Weight */}
        <InputField
          label="Weight (kg)"
          placeholder="Ex: 68"
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
        />

        {/* Goal */}
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

        {/* Activity */}
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

        {/* Save */}
        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveText}>Save Changes</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// input dùng chung
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
      <Text style={styles.label}>{label}</Text>

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

// group chọn option
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
      <Text style={styles.label}>{label}</Text>

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
