import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, Mail } from "lucide-react-native";

export function ForgotPassword() {
  const [email, setEmail] = useState("");

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <ChevronLeft size={22} color="#0F172A" />
      </Pressable>

      <Text style={styles.title}>Forgot{"\n"}Password?</Text>

      <Text style={styles.subtitle}>
        Enter your registered email and we'll send you a reset link.
      </Text>

      <Text style={styles.label}>Email Address</Text>

      <View style={styles.input}>
        <Mail size={18} color="#94A3B8" />

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          placeholderTextColor="#94A3B8"
          style={{ flex: 1, marginLeft: 12 }}
        />
      </View>

      <Pressable
        style={styles.button}
        onPress={() => router.push("/verify-otp")}
      >
        <Text style={styles.buttonText}>Send OTP</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9F8",
    paddingHorizontal: 24,
  },

  backBtn: {
    width: 44,
    height: 44,
    backgroundColor: "#fff",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 32,
    lineHeight: 40,
  },

  subtitle: {
    color: "#64748B",
    marginTop: 14,
    lineHeight: 24,
    fontSize: 15,
  },

  label: {
    marginTop: 32,
    fontWeight: "600",
    color: "#334155",
  },

  input: {
    marginTop: 12,
    height: 58,
    backgroundColor: "#fff",
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
  },

  button: {
    marginTop: 30,
    height: 58,
    backgroundColor: "#10B981",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
