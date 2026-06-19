import React, { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react-native";

import { useAuth } from "@/context/AuthContext";
import type { ApiError } from "@/lib/apiClient";

interface FormErrors {
  displayName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
  general?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//validate form sign in
function validateSignIn(email: string, password: string): FormErrors {
  const errors: FormErrors = {};

  // Kiểm tra email rỗng
  if (!email.trim()) {
    errors.email = "Email is required";
  }
  // Kiểm tra email sai format
  else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Invalid email";
  }

  // Kiểm tra password rỗng
  if (!password) {
    errors.password = "Password is required";
  }

  return errors;
}

//validate form sign up
function validateSignUp(
  email: string,
  password: string,
  confirmPassword: string,
  displayName: string,
  agreeTerms: boolean,
): FormErrors {
  const errors: FormErrors = {};

  // Check tên hiển thị
  if (!displayName.trim()) {
    errors.displayName = "Display name is required";
  }

  // Check email
  if (!email.trim()) {
    errors.email = "Email is required";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Invalid email";
  }

  // Check password
  if (!password) {
    errors.password = "Password is required";
  }
  // Password tối thiểu 8 ký tự
  else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  }

  // Confirm password phải giống password
  if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  // Checkbox điều khoản bắt buộc tick
  if (!agreeTerms) {
    errors.terms = "You must agree to the Terms of Service";
  }

  return errors;
}

//xử lý lỗi be
function parseServerError(err: ApiError): FormErrors {
  const msg = err.message ?? "";

  // Email đã tồn tại
  if (err.status === 409) {
    return {
      email: "This email has already been registered.",
    };
  }

  // Unauthorized
  if (err.status === 401) {
    // Nếu tài khoản này dùng Google
    if (msg.includes("Google")) {
      return {
        general:
          "This account uses Google Sign-In. Please continue with Google.",
      };
    }

    // Sai tài khoản/mật khẩu
    return {
      general: "Incorrect email or password.",
    };
  }

  // Lỗi mặc định
  return {
    general: msg || "Something went wrong. Please try again.",
  };
}

export function Auth() {
  const [isSignup, setIsSignup] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [agreeTerms, setAgreeTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { emailLogin, register, googleSignIn } = useAuth();

  function switchTab(signup: boolean) {
    setIsSignup(signup);

    // reset lỗi
    setErrors({});

    // reset dữ liệu form
    setDisplayName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");

    // reset checkbox
    setAgreeTerms(false);

    // reset trạng thái show password
    setShowPassword(false);
    setShowConfirm(false);
  }

  async function handleSubmit() {
    // Ẩn bàn phím trước khi xử lý
    Keyboard.dismiss();

    //validate phía client trước
    const clientErrors = isSignup
      ? validateSignUp(
          email,
          password,
          confirmPassword,
          displayName,
          agreeTerms,
        )
      : validateSignIn(email, password);

    //có lỗi thì dừng
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    //clear lỗi cũ
    setErrors({});
    setLoading(true);

    try {
      //sign up gọi register / sign in gọi login
      if (isSignup) {
        await register(
          email.trim().toLowerCase(),
          password,
          displayName.trim(),
        );
      } else {
        await emailLogin(email.trim().toLowerCase(), password);
      }
    } catch (err: unknown) {
      //parse lỗi be ra ui
      setErrors(parseServerError(err as ApiError));
    } finally {
      setLoading(false);
    }
  }

  //login bằng gg
  async function handleGoogleSignIn() {
    setErrors({});
    setGoogleLoading(true);

    try {
      await googleSignIn();
    } catch (err: unknown) {
      const apiErr = err as ApiError;

      //hiển thị lỗi từ server
      setErrors({
        general: apiErr.message ?? "Google Sign-In failed.",
      });
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Tabs */}
            <View style={styles.tabWrapper}>
              <Pressable
                style={[styles.tab, !isSignup && styles.activeTab]}
                onPress={() => switchTab(false)}
              >
                <Text
                  style={[styles.tabText, !isSignup && styles.activeTabText]}
                >
                  Login
                </Text>
              </Pressable>

              <Pressable
                style={[styles.tab, isSignup && styles.activeTab]}
                onPress={() => switchTab(true)}
              >
                <Text
                  style={[styles.tabText, isSignup && styles.activeTabText]}
                >
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
              {isSignup ? "Create Account" : "Welcome Back"}
            </Text>

            <Text style={styles.subtitle}>
              {isSignup
                ? "Start your health journey today"
                : "Continue your healthy lifestyle"}
            </Text>

            {/* General Error */}
            {errors.general && (
              <View style={styles.generalError}>
                <Text style={styles.generalErrorText}>{errors.general}</Text>
              </View>
            )}

            {/* Inputs */}
            {isSignup && (
              <InputField
                icon={<User size={18} color="#94A3B8" />}
                placeholder="Display Name"
                value={displayName}
                onChangeText={setDisplayName}
                error={errors.displayName}
              />
            )}

            <InputField
              icon={<Mail size={18} color="#94A3B8" />}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
            />

            <InputField
              icon={<Lock size={18} color="#94A3B8" />}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              secureTextEntry={!showPassword}
              rightIcon={
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </Pressable>
              }
            />

            {isSignup && (
              <InputField
                icon={<Lock size={18} color="#94A3B8" />}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                error={errors.confirmPassword}
                secureTextEntry={!showConfirm}
                rightIcon={
                  <Pressable onPress={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </Pressable>
                }
              />
            )}

            {/* Terms */}
            {isSignup ? (
              <>
                <View style={styles.row}>
                  <Pressable
                    style={[
                      styles.checkbox,
                      agreeTerms && styles.checkboxChecked,
                    ]}
                    onPress={() => setAgreeTerms(!agreeTerms)}
                  >
                    {agreeTerms && <Text style={styles.checkmark}>✓</Text>}
                  </Pressable>

                  <Text style={styles.smallText}>
                    I agree to the{" "}
                    <Text style={styles.greenText}>Terms of Service</Text>
                  </Text>
                </View>

                {errors.terms && (
                  <Text style={styles.fieldError}>{errors.terms}</Text>
                )}
              </>
            ) : (
              <View style={styles.row}>
                <View />
                <Pressable onPress={() => router.push("/forgot-password")}>
                  <Text style={styles.greenText}>Forgot Password?</Text>
                </Pressable>
              </View>
            )}

            {/* Submit */}
            <Pressable
              style={[styles.ctaButton, loading && styles.ctaDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.ctaText}>
                  {isSignup ? "Create Account" : "Login"}
                </Text>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.line} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.line} />
            </View>

            {/* Google */}
            <Pressable style={styles.googleBtn} onPress={handleGoogleSignIn}>
              {googleLoading ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.googleText}>Continue with Google</Text>
              )}
            </Pressable>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.smallText}>
                {isSignup
                  ? "Already have an account?"
                  : "Don't have an account?"}
              </Text>

              <Pressable onPress={() => switchTab(!isSignup)}>
                <Text style={styles.greenText}>
                  {isSignup ? " Login" : " Sign Up"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InputField({
  icon,
  placeholder,
  value,
  onChangeText,
  error,
  rightIcon,
  secureTextEntry,
}: any) {
  return (
    <View style={styles.inputWrapper}>
      <View style={[styles.input, error && styles.inputError]}>
        {icon}

        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          style={styles.inputText}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
        />

        {rightIcon}
      </View>

      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9F8", paddingHorizontal: 28 },
  tabWrapper: { flexDirection: "row", marginTop: 20 },
  tab: { flex: 1, padding: 14, alignItems: "center" },
  activeTab: { borderBottomWidth: 2, borderColor: "#10B981" },
  tabText: { color: "#94A3B8" },
  activeTabText: { color: "#10B981", fontWeight: "700" },
  avatarWrapper: { alignItems: "center", marginTop: 24 },
  avatarCircle: {
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: "#DDF7EF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: { width: 120, height: 120 },
  title: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 20,
  },
  subtitle: {
    textAlign: "center",
    color: "#64748B",
    marginTop: 8,
    marginBottom: 20,
  },
  inputWrapper: { marginBottom: 14 },
  input: {
    height: 58,
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  inputError: { borderWidth: 1, borderColor: "#EF4444" },
  inputText: { flex: 1, marginLeft: 12 },
  fieldError: {
    color: "#EF4444",
    marginTop: 6,
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 4,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  checkmark: {
    color: "white",
    fontWeight: "700",
    fontSize: 12,
  },
  smallText: { color: "#64748B" },
  greenText: { color: "#10B981", fontWeight: "600" },
  ctaButton: {
    height: 58,
    borderRadius: 999,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: "white", fontWeight: "700" },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  line: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
  orText: { marginHorizontal: 10 },
  googleBtn: {
    height: 58,
    borderRadius: 999,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  googleText: { fontWeight: "600" },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 28,
    marginBottom: 30,
  },
  generalError: {
    backgroundColor: "#FEF2F2",
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  generalErrorText: { color: "#DC2626" },
});
