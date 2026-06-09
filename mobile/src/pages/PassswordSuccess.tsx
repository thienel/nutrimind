import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CircleCheck } from "lucide-react-native";

export function PasswordSuccess() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.iconWrapper}>
        <CircleCheck size={54} color="#10B981" />
      </View>

      <Text style={styles.title}>Password Updated</Text>

      <Text style={styles.subtitle}>
        Your password has been changed successfully. Please login again.
      </Text>

      <Pressable style={styles.button} onPress={() => router.replace("/auth")}>
        <Text style={styles.buttonText}>Back to Login</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9F8",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    marginTop: 30,
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
  },

  subtitle: {
    marginTop: 12,
    textAlign: "center",
    color: "#64748B",
    lineHeight: 26,
    maxWidth: 280,
  },

  button: {
    marginTop: 40,
    width: "100%",
    height: 58,
    borderRadius: 24,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
