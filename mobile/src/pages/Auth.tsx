import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Mail, Lock, User, Eye } from "lucide-react-native";

export function Auth() {
  const [isSignup, setIsSignup] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
        }}
      >
        {/* Tabs */}
        <View style={styles.tabWrapper}>
          <Pressable
            style={[styles.tab, !isSignup && styles.activeTab]}
            onPress={() => setIsSignup(false)}
          >
            <Text style={[styles.tabText, !isSignup && styles.activeTabText]}>
              Sign In
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, isSignup && styles.activeTab]}
            onPress={() => setIsSignup(true)}
          >
            <Text style={[styles.tabText, isSignup && styles.activeTabText]}>
              Sign Up
            </Text>
          </Pressable>
        </View>

        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarCircle}>
            <Image
              source={{
                uri: "https://cdn-icons-png.flaticon.com/512/4140/4140048.png",
              }}
              style={styles.avatar}
            />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {isSignup ? "Create your account" : "Welcome back"}
        </Text>

        <Text style={styles.subtitle}>
          {isSignup
            ? "Start your health journey today"
            : "Continue your healthy lifestyle"}
        </Text>

        {/* Inputs */}
        {isSignup && (
          <InputField
            icon={<User size={18} color="#94A3B8" />}
            placeholder="Full Name"
          />
        )}

        <InputField
          icon={<Mail size={18} color="#94A3B8" />}
          placeholder="Email"
        />

        <InputField
          icon={<Lock size={18} color="#94A3B8" />}
          placeholder="Password"
          rightIcon={<Eye size={18} color="#94A3B8" />}
        />

        {isSignup && (
          <InputField
            icon={<Lock size={18} color="#94A3B8" />}
            placeholder="Confirm Password"
            rightIcon={<Eye size={18} color="#94A3B8" />}
          />
        )}

        {/* Remember / Terms */}
        {!isSignup ? (
          <View style={styles.row}>
            <View style={styles.row}>
              <View style={styles.checkbox} />

              <Text style={styles.smallText}>Remember me</Text>
            </View>

            <Pressable onPress={() => router.push("/forgot-password")}>
              <Text style={styles.greenText}>Forgot Password?</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.row}>
            <View style={styles.checkbox} />

            <Text style={styles.smallText}>
              I agree to the{" "}
              <Text style={styles.greenText}>Terms & Conditions</Text>
            </Text>
          </View>
        )}

        {/* CTA */}
        <Pressable
          style={styles.ctaButton}
          onPress={() => router.push("/welcome-setup")}
        >
          <Text style={styles.ctaText}>
            {isSignup ? "Create Account" : "Sign In"}
          </Text>
        </Pressable>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.line} />

          <Text style={styles.orText}>OR</Text>

          <View style={styles.line} />
        </View>

        {/* Google */}
        <Pressable style={styles.googleBtn}>
          <Image
            source={{
              uri: "https://www.svgrepo.com/show/475656/google-color.svg",
            }}
            style={{
              width: 22,
              height: 22,
            }}
          />

          <Text style={styles.googleText}>Continue with Google</Text>
        </Pressable>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.smallText}>
            {isSignup ? "Already have an account?" : "Don't have an account?"}
          </Text>

          <Pressable onPress={() => setIsSignup(!isSignup)}>
            <Text style={styles.greenText}>
              {isSignup ? " Sign In" : " Sign Up"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InputField({ icon, placeholder, rightIcon }: any) {
  return (
    <View style={styles.input}>
      {icon}

      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        style={{
          flex: 1,
          marginLeft: 12,
        }}
      />

      {rightIcon}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9F8",
    paddingHorizontal: 28,
  },

  tabWrapper: {
    flexDirection: "row",
    backgroundColor: "#EEF2F7",
    borderRadius: 999,
    padding: 4,
    marginTop: 20,
    alignSelf: "center",
  },

  tab: {
    width: 110,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 999,
  },

  activeTab: {
    backgroundColor: "#fff",
  },

  tabText: {
    color: "#94A3B8",
    fontWeight: "600",
  },

  activeTabText: {
    color: "#0F172A",
  },

  avatarWrapper: {
    alignItems: "center",
    marginTop: 35,
  },

  avatarCircle: {
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "#DDF7EF",
    justifyContent: "center",
    alignItems: "center",
  },

  avatar: {
    width: 150,
    height: 150,
  },

  title: {
    fontSize: 42,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginTop: 30,
  },

  subtitle: {
    textAlign: "center",
    color: "#64748B",
    marginTop: 10,
    marginBottom: 30,
    fontSize: 16,
  },

  input: {
    height: 58,
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
    marginBottom: 20,
  },

  checkbox: {
    width: 14,
    height: 14,
    backgroundColor: "#444",
    marginRight: 8,
  },

  smallText: {
    color: "#64748B",
  },

  greenText: {
    color: "#10B981",
    fontWeight: "600",
  },

  ctaButton: {
    height: 58,
    borderRadius: 999,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },

  ctaText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 17,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 30,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },

  orText: {
    marginHorizontal: 15,
    color: "#94A3B8",
  },

  googleBtn: {
    height: 58,
    backgroundColor: "#fff",
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    elevation: 2,
  },

  googleText: {
    fontWeight: "600",
    color: "#334155",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
  },
});
