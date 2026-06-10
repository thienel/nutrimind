import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

export function PersonalSetup() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Progress */}
        <View style={styles.progressHeader}>
          <Pressable onPress={() => router.back()}>
            <ChevronLeft size={22} />
          </Pressable>

          <Text style={styles.stepText}>1 of 2</Text>
        </View>

        <View style={styles.progressBg}>
          <View style={styles.progressHalf} />
        </View>

        <Text style={styles.title}>Tell us about you</Text>

        <Text style={styles.subtitle}>Help us personalize your goals.</Text>

        <Input label="Age" placeholder="21" />

        <Input label="Gender" placeholder="Male" />

        <Input label="Height (cm)" placeholder="175" />

        <Input label="Weight (kg)" placeholder="65" />

        <Input label="Goal Weight" placeholder="60" />

        <Pressable
          style={styles.button}
          onPress={() => router.push("/health-profile")}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Input({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
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
  },

  button: {
    marginTop: 10,
    height: 58,
    borderRadius: 999,
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
