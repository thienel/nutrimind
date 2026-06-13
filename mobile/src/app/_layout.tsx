/**
 * Root Layout — bọc toàn bộ app trong AuthProvider
 *
 * - Khởi tạo Google Sign-In SDK một lần khi app mount
 * - Bọc tất cả screens trong AuthProvider
 * - AuthProvider tự thực hiện startup check (spec §2.6) và navigate
 *   đến màn hình phù hợp sau khi SplashScreen ẩn
 */

import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { AuthProvider } from "@/context/AuthContext";
import { initGoogleSignIn } from "@/lib/googleSignIn";

// Giữ SplashScreen cho đến khi AuthProvider xong startup check
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Khởi tạo Google Sign-In SDK (spec §2.2)
    initGoogleSignIn();
  }, []);

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Auth screens */}
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="verify-otp" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="password-success" />

      {/* Onboarding screens */}
      <Stack.Screen name="welcome-setup" />
      <Stack.Screen name="personal-setup" />
      <Stack.Screen name="personal-information" />
      <Stack.Screen name="health-profile" />
      <Stack.Screen name="health-summary" />
      <Stack.Screen name="first-week-plan" />

      {/* Main tabs */}
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
