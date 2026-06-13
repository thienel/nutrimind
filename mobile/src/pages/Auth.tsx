/**
 * Auth Page — Đăng nhập / Đăng ký
 *
 * Spec §2.3 (register), §2.4 (email login), §2.5 (Google sign-in)
 *
 * - Validation client-side inline
 * - Kết nối AuthContext để thực hiện API calls
 * - Loading state, error messages theo từng field
 * - Google Sign-In button
 */

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

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormErrors {
  displayName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSignIn(email: string, password: string): FormErrors {
  const errors: FormErrors = {};
  if (!email.trim()) errors.email = "Email là bắt buộc";
  else if (!EMAIL_REGEX.test(email)) errors.email = "Email không hợp lệ";
  if (!password) errors.password = "Mật khẩu là bắt buộc";
  return errors;
}

function validateSignUp(
  email: string,
  password: string,
  confirmPassword: string,
  displayName: string
): FormErrors {
  const errors: FormErrors = {};
  if (!displayName.trim()) errors.displayName = "Tên hiển thị là bắt buộc";
  if (!email.trim()) errors.email = "Email là bắt buộc";
  else if (!EMAIL_REGEX.test(email)) errors.email = "Email không hợp lệ";
  if (!password) errors.password = "Mật khẩu là bắt buộc";
  else if (password.length < 8)
    errors.password = "Mật khẩu tối thiểu 8 ký tự";
  if (password !== confirmPassword)
    errors.confirmPassword = "Mật khẩu xác nhận không khớp";
  return errors;
}

/** Map server error message → lỗi field/general */
function parseServerError(err: ApiError): FormErrors {
  const msg = err.message ?? "";
  if (err.status === 409)
    return { email: "Email này đã được đăng ký. Vui lòng đăng nhập." };
  if (err.status === 401) {
    if (msg.includes("Google"))
      return {
        general:
          "Tài khoản này đăng nhập bằng Google Sign-In. Vui lòng dùng nút Google.",
      };
    return { general: "Email hoặc mật khẩu không đúng." };
  }
  return { general: msg || "Đã có lỗi xảy ra. Vui lòng thử lại." };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Auth() {
  const [isSignup, setIsSignup] = useState(false);

  // Form fields
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { emailLogin, register, googleSignIn } = useAuth();

  // ── Switch tabs — clear form ──────────────────────────────────────────────
  function switchTab(signup: boolean) {
    setIsSignup(signup);
    setErrors({});
    setDisplayName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirm(false);
  }

  // ── Submit Email form ─────────────────────────────────────────────────────
  async function handleSubmit() {
    Keyboard.dismiss();

    // Client-side validation
    const clientErrors = isSignup
      ? validateSignUp(email, password, confirmPassword, displayName)
      : validateSignIn(email, password);

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      if (isSignup) {
        await register(email.trim().toLowerCase(), password, displayName.trim());
      } else {
        await emailLogin(email.trim().toLowerCase(), password);
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setErrors(parseServerError(apiErr));
    } finally {
      setLoading(false);
    }
  }

  // ── Google Sign-In ────────────────────────────────────────────────────────
  async function handleGoogleSignIn() {
    setErrors({});
    setGoogleLoading(true);
    try {
      await googleSignIn();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setErrors({ general: apiErr.message ?? "Đăng nhập Google thất bại." });
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
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Tabs ───────────────────────────────────────────────────── */}
            <View style={styles.tabWrapper}>
              <Pressable
                style={[styles.tab, !isSignup && styles.activeTab]}
                onPress={() => switchTab(false)}
                accessibilityRole="tab"
                accessibilityState={{ selected: !isSignup }}
              >
                <Text style={[styles.tabText, !isSignup && styles.activeTabText]}>
                  Đăng nhập
                </Text>
              </Pressable>

              <Pressable
                style={[styles.tab, isSignup && styles.activeTab]}
                onPress={() => switchTab(true)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSignup }}
              >
                <Text style={[styles.tabText, isSignup && styles.activeTabText]}>
                  Đăng ký
                </Text>
              </Pressable>
            </View>

            {/* ── Avatar ─────────────────────────────────────────────────── */}
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

            {/* ── Title ──────────────────────────────────────────────────── */}
            <Text style={styles.title}>
              {isSignup ? "Tạo tài khoản" : "Chào mừng trở lại"}
            </Text>
            <Text style={styles.subtitle}>
              {isSignup
                ? "Bắt đầu hành trình sức khoẻ của bạn"
                : "Tiếp tục lối sống lành mạnh"}
            </Text>

            {/* ── General error ───────────────────────────────────────────── */}
            {errors.general ? (
              <View style={styles.generalError}>
                <Text style={styles.generalErrorText}>{errors.general}</Text>
              </View>
            ) : null}

            {/* ── Inputs ─────────────────────────────────────────────────── */}
            {isSignup && (
              <InputField
                icon={<User size={18} color={errors.displayName ? "#EF4444" : "#94A3B8"} />}
                placeholder="Tên hiển thị"
                value={displayName}
                onChangeText={(t) => {
                  setDisplayName(t);
                  if (errors.displayName) setErrors((e) => ({ ...e, displayName: undefined }));
                }}
                error={errors.displayName}
                autoCapitalize="words"
                returnKeyType="next"
              />
            )}

            <InputField
              icon={<Mail size={18} color={errors.email ? "#EF4444" : "#94A3B8"} />}
              placeholder="Email"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
              }}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
            />

            <InputField
              icon={<Lock size={18} color={errors.password ? "#EF4444" : "#94A3B8"} />}
              placeholder="Mật khẩu"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
              }}
              error={errors.password}
              secureTextEntry={!showPassword}
              rightIcon={
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  {showPassword ? (
                    <EyeOff size={18} color="#94A3B8" />
                  ) : (
                    <Eye size={18} color="#94A3B8" />
                  )}
                </Pressable>
              }
              returnKeyType={isSignup ? "next" : "done"}
              onSubmitEditing={isSignup ? undefined : handleSubmit}
            />

            {isSignup && (
              <InputField
                icon={<Lock size={18} color={errors.confirmPassword ? "#EF4444" : "#94A3B8"} />}
                placeholder="Xác nhận mật khẩu"
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  if (errors.confirmPassword)
                    setErrors((e) => ({ ...e, confirmPassword: undefined }));
                }}
                error={errors.confirmPassword}
                secureTextEntry={!showConfirm}
                rightIcon={
                  <Pressable onPress={() => setShowConfirm((v) => !v)} hitSlop={8}>
                    {showConfirm ? (
                      <EyeOff size={18} color="#94A3B8" />
                    ) : (
                      <Eye size={18} color="#94A3B8" />
                    )}
                  </Pressable>
                }
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            )}

            {/* ── Remember / Terms ────────────────────────────────────────── */}
            {!isSignup ? (
              <View style={styles.row}>
                <View style={styles.row} />
                <Pressable onPress={() => router.push("/forgot-password")}>
                  <Text style={styles.greenText}>Quên mật khẩu?</Text>
                </Pressable>
              </View>
            ) : (
              <View style={[styles.row, { marginTop: 8 }]}>
                <View style={styles.checkbox} />
                <Text style={styles.smallText}>
                  Tôi đồng ý với{" "}
                  <Text style={styles.greenText}>Điều khoản sử dụng</Text>
                </Text>
              </View>
            )}

            {/* ── CTA Button ─────────────────────────────────────────────── */}
            <Pressable
              style={[styles.ctaButton, loading && styles.ctaDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={isSignup ? "Tạo tài khoản" : "Đăng nhập"}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.ctaText}>
                  {isSignup ? "Tạo tài khoản" : "Đăng nhập"}
                </Text>
              )}
            </Pressable>

            {/* ── Divider ────────────────────────────────────────────────── */}
            <View style={styles.dividerRow}>
              <View style={styles.line} />
              <Text style={styles.orText}>HOẶC</Text>
              <View style={styles.line} />
            </View>

            {/* ── Google Button ───────────────────────────────────────────── */}
            <Pressable
              style={[styles.googleBtn, googleLoading && styles.ctaDisabled]}
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
              accessibilityRole="button"
              accessibilityLabel="Đăng nhập bằng Google"
            >
              {googleLoading ? (
                <ActivityIndicator color="#334155" size="small" />
              ) : (
                <>
                  <Image
                    source={{
                      uri: "https://www.svgrepo.com/show/475656/google-color.svg",
                    }}
                    style={{ width: 22, height: 22 }}
                  />
                  <Text style={styles.googleText}>Tiếp tục với Google</Text>
                </>
              )}
            </Pressable>

            {/* ── Footer ─────────────────────────────────────────────────── */}
            <View style={styles.footer}>
              <Text style={styles.smallText}>
                {isSignup ? "Đã có tài khoản?" : "Chưa có tài khoản?"}
              </Text>
              <Pressable onPress={() => switchTab(!isSignup)}>
                <Text style={styles.greenText}>
                  {isSignup ? " Đăng nhập" : " Đăng ký"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── InputField Component ─────────────────────────────────────────────────────

interface InputFieldProps {
  icon?: React.ReactNode;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  rightIcon?: React.ReactNode;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoComplete?: string;
  returnKeyType?: "done" | "next" | "go" | "search" | "send";
  onSubmitEditing?: () => void;
}

function InputField({
  icon,
  placeholder,
  value,
  onChangeText,
  error,
  rightIcon,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize,
  returnKeyType,
  onSubmitEditing,
}: InputFieldProps) {
  return (
    <View style={styles.inputWrapper}>
      <View style={[styles.input, !!error && styles.inputError]}>
        {icon}
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          style={styles.inputText}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
        />
        {rightIcon}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    width: 120,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 999,
  },

  activeTab: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  tabText: {
    color: "#94A3B8",
    fontWeight: "600",
    fontSize: 14,
  },

  activeTabText: {
    color: "#0F172A",
  },

  avatarWrapper: {
    alignItems: "center",
    marginTop: 28,
  },

  avatarCircle: {
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: "#DDF7EF",
    justifyContent: "center",
    alignItems: "center",
  },

  avatar: {
    width: 120,
    height: 120,
  },

  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginTop: 22,
  },

  subtitle: {
    textAlign: "center",
    color: "#64748B",
    marginTop: 8,
    marginBottom: 22,
    fontSize: 15,
  },

  generalError: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },

  generalErrorText: {
    color: "#DC2626",
    fontSize: 14,
    lineHeight: 20,
  },

  inputWrapper: {
    marginBottom: 14,
  },

  input: {
    height: 58,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: "transparent",
  },

  inputError: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FFF5F5",
  },

  inputText: {
    flex: 1,
    marginLeft: 12,
    color: "#0F172A",
    fontSize: 15,
  },

  fieldError: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 5,
    marginLeft: 16,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    marginRight: 10,
  },

  smallText: {
    color: "#64748B",
    fontSize: 14,
  },

  greenText: {
    color: "#10B981",
    fontWeight: "600",
    fontSize: 14,
  },

  ctaButton: {
    height: 58,
    borderRadius: 999,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },

  ctaDisabled: {
    opacity: 0.65,
  },

  ctaText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 17,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 26,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },

  orText: {
    marginHorizontal: 14,
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
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
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  googleText: {
    fontWeight: "600",
    color: "#334155",
    fontSize: 15,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 28,
  },
});
