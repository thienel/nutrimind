import React from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Leaf } from "lucide-react-native";

export function Onboarding() {
  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoRow}>
        <View style={styles.logoBox}>
          <Leaf size={22} color="#fff" />
        </View>

        <Text style={styles.logoText}>NutriMind</Text>
      </View>

      {/* Title */}
      <View>
        <Text style={styles.title}>
          Eat Better,{"\n"}
          Stay Healthy,{"\n"}
          Together 💚
        </Text>

        <Text style={styles.description}>
          Track meals with AI, monitor hydration, get personalized nutrition
          coaching, and stay motivated with friends and healthy challenges.
        </Text>
      </View>

      {/* Image */}
      <View style={styles.imageWrapper}>
        <View style={styles.imageCircle}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1000",
            }}
            style={styles.image}
          />
        </View>
      </View>

      {/* Pagination */}
      <View style={styles.pagination}>
        <View style={styles.activeDot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>

      {/* Buttons */}
      <View>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push("/auth")}
        >
          <Text style={styles.primaryText}>Get Started</Text>
        </Pressable>

        <View style={styles.signInRow}>
          <Text style={styles.signInText}>Already have an account?</Text>

          <Pressable onPress={() => router.push("/auth")}>
            <Text style={styles.signInLink}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9F8",
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 30,
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 36,
  },

  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  logoText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },

  title: {
    fontSize: 42,
    lineHeight: 46,
    fontWeight: "800",
    color: "#0F172A",
  },

  description: {
    marginTop: 18,
    fontSize: 16,
    lineHeight: 26,
    color: "#64748B",
  },

  imageWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  imageCircle: {
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },

  image: {
    width: 275,
    height: 275,
    borderRadius: 140,
  },

  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
  },

  activeDot: {
    width: 32,
    height: 6,
    borderRadius: 10,
    backgroundColor: "#10B981",
    marginHorizontal: 4,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 10,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 4,
  },

  primaryButton: {
    height: 56,
    borderRadius: 999,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },

  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  signInRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },

  signInText: {
    color: "#64748B",
  },

  signInLink: {
    color: "#10B981",
    fontWeight: "700",
    marginLeft: 5,
  },
});
