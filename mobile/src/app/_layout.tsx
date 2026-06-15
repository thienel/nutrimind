import { Suspense } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NetworkProvider } from "@/context/NetworkContext";
import { DatabaseManager, DB_NAME } from "../db/database";

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
    <Suspense
      fallback={
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
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
  );
}