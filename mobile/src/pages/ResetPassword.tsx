import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, Lock } from "lucide-react-native";

export function ResetPassword() {
  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <ChevronLeft size={22} />
      </Pressable>

      <Text style={styles.title}>Create New Password</Text>

      <Text style={styles.subtitle}>
        Your new password must be different from the previous one.
      </Text>

      <View style={{ marginTop: 30 }}>
        <PasswordInput placeholder="New Password" />

        <PasswordInput placeholder="Confirm Password" />
      </View>

      <Text style={styles.rule}>
        Password must contain:{"\n"}• At least 8 characters{"\n"}• Uppercase &
        lowercase{"\n"}• At least 1 number
      </Text>

      <Pressable
        style={styles.button}
        onPress={() => router.push("/password-success")}
      >
        <Text style={styles.buttonText}>Update Password</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function PasswordInput({ placeholder }: { placeholder: string }) {
  return (
    <View style={styles.input}>
      <Lock size={18} color="#94A3B8" />

      <TextInput
        secureTextEntry
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        style={{
          flex: 1,
          marginLeft: 12,
        }}
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
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 36,
  },

  subtitle: {
    marginTop: 10,
    color: "#64748B",
    lineHeight: 24,
  },

  input: {
    height: 58,
    backgroundColor: "#fff",
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 14,
  },

  rule: {
    marginTop: 10,
    color: "#94A3B8",
    lineHeight: 26,
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
    fontSize: 16,
    fontWeight: "700",
  },
});
