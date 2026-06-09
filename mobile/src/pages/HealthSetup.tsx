import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useState } from "react";

export function HealthSetup() {
  const [goal, setGoal] = useState("Lose Weight");

  const [activity, setActivity] = useState("Moderate");

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.step}>2 of 2</Text>
        </View>

        <View style={styles.progressBg}>
          <View style={styles.progressFull} />
        </View>

        <Text style={styles.title}>Your health goals</Text>

        <Text style={styles.subtitle}>Choose what fits your lifestyle.</Text>

        <Section title="Goal">
          <Option
            text="Lose Weight"
            active={goal === "Lose Weight"}
            onPress={() => setGoal("Lose Weight")}
          />

          <Option
            text="Gain Muscle"
            active={goal === "Gain Muscle"}
            onPress={() => setGoal("Gain Muscle")}
          />

          <Option
            text="Maintain"
            active={goal === "Maintain"}
            onPress={() => setGoal("Maintain")}
          />
        </Section>

        <Section title="Activity">
          <Option
            text="Sedentary"
            active={activity === "Sedentary"}
            onPress={() => setActivity("Sedentary")}
          />

          <Option
            text="Moderate"
            active={activity === "Moderate"}
            onPress={() => setActivity("Moderate")}
          />

          <Option
            text="Active"
            active={activity === "Active"}
            onPress={() => setActivity("Active")}
          />
        </Section>

        <Pressable
          style={styles.button}
          onPress={() => router.replace("/first-week-plan")}
        >
          <Text style={styles.buttonText}>Finish Setup</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: any) {
  return (
    <View style={{ marginBottom: 28 }}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {children}
    </View>
  );
}

function Option({ text, active, onPress }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.option, active && styles.activeOption]}
    >
      <Text style={[styles.optionText, active && styles.activeOptionText]}>
        {text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9F8",
    paddingHorizontal: 24,
  },

  header: {
    alignItems: "flex-end",
    marginTop: 10,
    marginBottom: 14,
  },

  step: {
    color: "#94A3B8",
  },

  progressBg: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    overflow: "hidden",
  },

  progressFull: {
    width: "100%",
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

  sectionTitle: {
    fontWeight: "700",
    marginBottom: 12,
  },

  option: {
    height: 58,
    backgroundColor: "#fff",
    borderRadius: 22,
    justifyContent: "center",
    paddingHorizontal: 18,
    marginBottom: 12,
  },

  activeOption: {
    backgroundColor: "#10B981",
  },

  optionText: {
    color: "#0F172A",
    fontWeight: "600",
  },

  activeOptionText: {
    color: "#fff",
  },

  button: {
    height: 58,
    backgroundColor: "#10B981",
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
