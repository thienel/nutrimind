/**
 * Root Layout — bọc toàn bộ app trong AuthProvider + NetworkProvider
 *
 * - Khởi tạo Google Sign-In SDK một lần khi app mount
 * - Khởi tạo SQLite database (schema migration)
 * - Bọc tất cả screens trong AuthProvider > NetworkProvider
 * - Bọc app bằng ErrorBoundary + ToastProvider dùng chung
 * - AuthProvider tự thực hiện startup check và navigate
 *   đến màn hình phù hợp sau khi SplashScreen ẩn
 */

import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { ToastProvider } from "@/components/ToastProvider";
import { AuthProvider } from "@/context/AuthContext";
import { NetworkProvider } from "@/context/NetworkContext";
import { useAuth } from "@/context/AuthContext";
import { initGoogleSignIn } from "@/lib/googleSignIn";
import { initDatabase } from "@/lib/db";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initGoogleSignIn();

    initDatabase()
      .then(() => setDbReady(true))
      .catch((e) => {
        console.error("[DB] initDatabase failed:", e);
        setDbReady(true);
      });
  }, []);

  if (!dbReady) {
    return <LoadingOverlay visible text="Preparing NutriMind..." />;
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <NetworkedApp />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

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
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="verify-otp" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="password-success" />

      <Stack.Screen name="welcome-setup" />
      <Stack.Screen name="personal-setup" />
      <Stack.Screen name="personal-information" />
      <Stack.Screen name="health-profile" />
      <Stack.Screen name="health-summary" />
      <Stack.Screen name="first-week-plan" />

      <Stack.Screen name="meal-log" />
      <Stack.Screen name="water-log" />
      <Stack.Screen name="weight-log" />

      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}