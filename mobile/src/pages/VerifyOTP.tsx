import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

export function VerifyOTP() {
  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <ChevronLeft size={22} />
      </Pressable>

      <Text style={styles.title}>Verify OTP</Text>

      <Text style={styles.subtitle}>
        Enter the 6-digit verification code sent to your email.
      </Text>

      <View style={styles.otpRow}>
        {[...Array(6)].map((_, i) => (
          <TextInput
            key={i}
            maxLength={1}
            keyboardType="numeric"
            style={styles.otpBox}
          />
        ))}
      </View>

      <Text style={styles.resend}>Resend OTP in 30s</Text>

      <Pressable
        style={styles.button}
        onPress={() => router.push("/reset-password")}
      >
        <Text style={styles.buttonText}>Verify Code</Text>
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
    borderRadius: 18,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  title: {
    marginTop: 40,
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
  },

  subtitle: {
    marginTop: 8,
    color: "#64748B",
    lineHeight: 24,
  },

  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 40,
  },

  otpBox: {
    width: 48,
    height: 60,
    borderRadius: 20,
    backgroundColor: "#fff",
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
  },

  resend: {
    textAlign: "center",
    marginTop: 24,
    color: "#94A3B8",
  },

  button: {
    marginTop: "auto",
    marginBottom: 20,
    height: 58,
    backgroundColor: "#10B981",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
