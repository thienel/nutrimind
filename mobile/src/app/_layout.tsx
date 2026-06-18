import "react-native-gesture-handler";

import { Suspense } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/ToastProvider";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NetworkProvider } from "@/context/NetworkContext";
import { DatabaseManager, DB_NAME } from "../db/database";
import { initGoogleSignIn } from "@/lib/googleSignIn";

// Khởi tạo Google Sign In một lần duy nhất khi app khởi động
initGoogleSignIn();

function AppWithProviders() {
  const { user } = useAuth();

  return (
    <NetworkProvider userId={user?.id ?? null}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </NetworkProvider>
  );
}

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ToastProvider>
          <Suspense
            fallback={
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "#F7F9F8",
                }}
              >
                <ActivityIndicator size="large" color="#10B981" />
              </View>
            }
          >
            <SQLiteProvider
              databaseName={DB_NAME}
              onInit={DatabaseManager.initialize}
              useSuspense
            >
              <AuthProvider>
                <AppWithProviders />
              </AuthProvider>
            </SQLiteProvider>
          </Suspense>
        </ToastProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}