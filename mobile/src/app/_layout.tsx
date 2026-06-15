import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { DatabaseManager, DB_NAME } from "../db/database";
import { Suspense } from "react";
import { ActivityIndicator, View } from "react-native";

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
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </SQLiteProvider>
    </Suspense>
  );
}
