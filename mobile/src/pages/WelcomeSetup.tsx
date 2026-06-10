import { router } from "expo-router";
import { Sparkles } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function WelcomeSetup() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Sparkles size={56} color="#10B981" />
        </View>

        <Text style={styles.title}>
          Let's personalize{"\n"}
          your journey ✨
        </Text>

        <Text style={styles.subtitle}>
          We'll create a nutrition plan based on your body and goals.
        </Text>
      </View>

      <Pressable
        style={styles.button}
        onPress={() => router.push("/personal-setup")}
      >
        <Text style={styles.buttonText}>Get Started</Text>
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

  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    marginTop: 36,
    textAlign: "center",
    fontSize: 34,
    fontWeight: "800",
    color: "#0F172A",
  },

  subtitle: {
    textAlign: "center",
    color: "#64748B",
    marginTop: 16,
    lineHeight: 28,
    maxWidth: 280,
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
