/**
 * Root Layout — bọc toàn bộ app trong AuthProvider + NetworkProvider
 *
 * - Khởi tạo Google Sign-In SDK một lần khi app mount
 * - Khởi tạo SQLite database (schema migration)
 * - Bọc tất cả screens trong AuthProvider > NetworkProvider
 * - AuthProvider tự thực hiện startup check (spec §2.6) và navigate
 *   đến màn hình phù hợp sau khi SplashScreen ẩn
 */

import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { AuthProvider } from "@/context/AuthContext";
import { NetworkProvider } from "@/context/NetworkContext";
import { useAuth } from "@/context/AuthContext";
import { initGoogleSignIn } from "@/lib/googleSignIn";
import { initDatabase } from "@/lib/db";

// Giữ SplashScreen cho đến khi AuthProvider xong startup check
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    // Khởi tạo Google Sign-In SDK (spec §2.2)
    initGoogleSignIn();

    // Khởi tạo SQLite database + migrations
    initDatabase()
      .then(() => setDbReady(true))
      .catch((e) => {
        console.error("[DB] initDatabase failed:", e);
        // Vẫn tiếp tục — app vẫn chạy được (chỉ mất offline capability)
        setDbReady(true);
      });
  }, []);

  if (!dbReady) return null;

  return (
    <AuthProvider>
      <NetworkedApp />
    </AuthProvider>
  );
}

/** Tách ra để có thể đọc user từ AuthContext cho NetworkProvider */
function NetworkedApp() {
  const { user } = useAuth();

  return (
    <NetworkProvider userId={user?.id ?? null}>
      <RootNavigator />
    </NetworkProvider>
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

      {/* Offline-capable logging screens */}
      <Stack.Screen name="meal-log" />
      <Stack.Screen name="water-log" />
      <Stack.Screen name="weight-log" />

      {/* Main tabs */}
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
