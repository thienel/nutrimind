import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function PersonalSetup() {
  // state step 1
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  // validate dữ liệu step 1
  const validate = () => {
    if (!age || !height || !weight) {
      Alert.alert("Validation Error", "Please fill all fields");
      return false;
    }

    if (+age < 10 || +age > 120) {
      Alert.alert("Validation Error", "Age must be 10 - 120");
      return false;
    }

    if (+height < 50 || +height > 300) {
      Alert.alert("Validation Error", "Height must be 50 - 300 cm");
      return false;
    }

    if (+weight < 15 || +weight > 500) {
      Alert.alert("Validation Error", "Weight must be 15 - 500 kg");
      return false;
    }

    return true;
  };

  // lưu step 1 vào AsyncStorage
  const handleContinue = async () => {
    if (!validate()) return;

    const payload = {
      age,
      gender,
      height,
      weight,
    };

    await AsyncStorage.setItem("onboarding_step_1", JSON.stringify(payload));

    router.push("/health-profile");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header progress */}
        <View style={styles.progressHeader}>
          <Pressable onPress={() => router.back()}>
            <ChevronLeft size={22} />
          </Pressable>

          <Text style={styles.stepText}>1 of 2</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <View style={styles.progressHalf} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Tell us about you</Text>
        <Text style={styles.subtitle}>Help us personalize your goals.</Text>

        {/* Age */}
        <Input label="Age" placeholder="Ex: 21" value={age} onChange={setAge} />

        {/* Gender */}
        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Gender</Text>

          <View style={styles.optionRow}>
            {["MALE", "FEMALE"].map((item) => (
              <Pressable
                key={item}
                style={[
                  styles.optionBtn,
                  gender === item && styles.optionBtnActive,
                ]}
                onPress={() => setGender(item as "MALE" | "FEMALE")}
              >
                <Text
                  style={[
                    styles.optionText,
                    gender === item && styles.optionTextActive,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Height */}
        <Input
          label="Height (cm)"
          placeholder="Ex: 175"
          value={height}
          onChange={setHeight}
        />

        {/* Weight */}
        <Input
          label="Weight (kg)"
          placeholder="Ex: 68"
          value={weight}
          onChange={setWeight}
        />

        {/* Continue */}
        <Pressable style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// component input dùng chung
function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9F8",
    paddingHorizontal: 24,
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 14,
  },

  stepText: {
    color: "#94A3B8",
  },

  progressBg: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    overflow: "hidden",
  },

  progressHalf: {
    width: "50%",
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

  inputWrapper: {
    marginBottom: 20,
  },

  label: {
    marginBottom: 8,
    color: "#334155",
    fontWeight: "600",
  },

  input: {
    height: 58,
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingHorizontal: 18,
    fontSize: 15,
    color: "#0F172A",
  },

  optionRow: {
    flexDirection: "row",
    gap: 12,
  },

  optionBtn: {
    flex: 1,
    height: 56,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },

  optionBtnActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },

  optionText: {
    color: "#64748B",
    fontWeight: "600",
  },

  optionTextActive: {
    color: "#FFFFFF",
  },

  button: {
    marginTop: 10,
    height: 58,
    borderRadius: 999,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
