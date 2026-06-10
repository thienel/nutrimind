import { useEffect, useState } from "react";

import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function PersonalInformation() {
  const [fullName, setFullName] = useState("");

  const [email, setEmail] = useState("");

  const [age, setAge] = useState("");

  const [gender, setGender] = useState("");

  const [height, setHeight] = useState("");

  const [weight, setWeight] = useState("");

  const [goalWeight, setGoalWeight] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const saved = await AsyncStorage.getItem("profile");

      if (!saved) {
        setFullName("John Doe");
        setEmail("john@email.com");
        setAge("21");
        setGender("Male");
        setHeight("175");
        setWeight("65");
        setGoalWeight("60");
        return;
      }

      const data = JSON.parse(saved);

      setFullName(data.fullName || "");
      setEmail(data.email || "");
      setAge(data.age || "");
      setGender(data.gender || "");
      setHeight(data.height || "");
      setWeight(data.weight || "");
      setGoalWeight(data.goalWeight || "");
    } catch (error) {
      console.log(error);
    }
  };

  const validate = () => {
    if (!fullName.trim()) {
      Alert.alert("Validation Error", "Full name is required");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      Alert.alert("Validation Error", "Invalid email address");
      return false;
    }

    if (+age < 10 || +age > 100) {
      Alert.alert("Validation Error", "Age must be between 10 and 100");
      return false;
    }

    if (+height < 100 || +height > 250) {
      Alert.alert("Validation Error", "Height must be between 100 and 250 cm");
      return false;
    }

    if (+weight < 20 || +weight > 300) {
      Alert.alert("Validation Error", "Weight must be between 20 and 300 kg");
      return false;
    }

    if (+goalWeight < 20 || +goalWeight > 300) {
      Alert.alert(
        "Validation Error",
        "Goal weight must be between 20 and 300 kg",
      );
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      const profileData = {
        fullName,
        email,
        age,
        gender,
        height,
        weight,
        goalWeight,
      };

      await AsyncStorage.setItem("profile", JSON.stringify(profileData));

      Alert.alert("Success", "Profile updated successfully", [
        {
          text: "OK",
          onPress: () => router.replace("/profile"),
        },
      ]);
    } catch (error) {
      console.log(error);
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

        <InputField
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
        />

        <InputField label="Email" value={email} onChangeText={setEmail} />

        <View style={styles.row}>
          <InputField
            label="Age"
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
            half
          />

          <InputField
            label="Gender"
            value={gender}
            onChangeText={setGender}
            half
          />
        </View>

        <View style={styles.row}>
          <InputField
            label="Height (cm)"
            value={height}
            onChangeText={setHeight}
            keyboardType="numeric"
            half
          />

          <InputField
            label="Weight (kg)"
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            half
          />
        </View>

        <InputField
          label="Goal Weight"
          value={goalWeight}
          onChangeText={setGoalWeight}
          keyboardType="numeric"
        />

        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveText}>Save Changes</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  half = false,
}: any) {
  return (
    <View style={[styles.inputWrapper, half && { flex: 1 }]}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
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

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
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
    marginBottom: 18,
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

  row: {
    flexDirection: "row",
    gap: 12,
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
