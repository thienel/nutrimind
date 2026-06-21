import "react-native-gesture-handler";

import { Suspense, useEffect } from "react";
import { ActivityIndicator, View, Alert } from "react-native";
import { Stack, router, useSegments } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/ToastProvider";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NetworkProvider } from "@/context/NetworkContext";
import { DatabaseManager, DB_NAME } from "../db/database";
import { initGoogleSignIn } from "@/lib/googleSignIn";
import { getMyProfile } from "@/services/profileService";
import { isProfileCompleted } from "@/utils/profile";

// =======================================================
// Khởi tạo Google Sign In một lần duy nhất khi app start
// Tránh init lại nhiều lần gây lỗi
// =======================================================
initGoogleSignIn();

function AppWithProviders() {
  // lấy thông tin user hiện tại từ AuthContext
  const { user } = useAuth();

  // lấy route hiện tại (expo-router)
  const segments = useSegments();
  const pathString = segments.join("/");

  useEffect(() => {
    // =======================================================
    // Hàm kiểm tra profile của user
    //
    // Mục tiêu:
    // - chặn user dùng các chức năng chính nếu chưa setup profile
    // - ép user hoàn thiện thông tin cá nhân trước
    // =======================================================
    const checkProfile = async () => {
      // nếu chưa login thì không cần check
      if (!user) return;

      // =======================================================
      // Các route được phép vào dù chưa setup profile
      // Ví dụ:
      // - auth
      // - welcome setup
      // - personal info
      // - health profile
      // - profile
      // - index
      // =======================================================
      const safeRoutes = [
        "personal-information",
        "welcome-setup",
        "personal-setup",
        "health-profile",
        "profile",
        "index",
        "auth",
      ];

      // kiểm tra route hiện tại hoặc bất kỳ segment nào (ví dụ trong tabs) có nằm trong safeRoutes không
      const isSafeRoute = segments.some((segment) => safeRoutes.includes(segment));

      // nếu đang ở route an toàn -> bỏ qua check
      if (isSafeRoute) return;

      try {
        // gọi API lấy profile từ backend
        const profile = await getMyProfile();

        // kiểm tra profile đã đầy đủ chưa
        const completed = isProfileCompleted(profile);

        // nếu chưa hoàn thành setup
        if (!completed) {
          Alert.alert(
            "Setup Required",
            "Please complete your personal information before using this feature.",
            [
              {
                // user đóng alert nhưng vẫn ở lại màn hiện tại
                text: "Later",
                style: "cancel",
              },
              {
                // chuyển user tới màn nhập thông tin
                text: "Go now",
                onPress: () => router.replace("/personal-information"),
              },
            ],
          );
        }
      } catch (error: any) {
        // =======================================================
        // Nếu backend trả 404:
        // nghĩa là user chưa từng tạo profile
        // =======================================================
        if (error?.status === 404) {
          Alert.alert(
            "Setup Required",
            "Please complete your personal information before using this feature.",
            [
              {
                text: "Later",
                style: "cancel",
              },
              {
                text: "Go now",
                onPress: () => router.replace("/personal-information"),
              },
            ],
          );
          return;
        }

        // log các lỗi khác để debug
        console.log("CHECK PROFILE ERROR:", error);
      }
    };

    // chạy check mỗi khi:
    // - user thay đổi
    // - route thay đổi
    checkProfile();
  }, [user, pathString]);

  return (
    // =======================================================
    // NetworkProvider dùng để quản lý trạng thái online/offline
    // và đồng bộ dữ liệu theo user
    // =======================================================
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
    // root wrapper cho gesture
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* bắt lỗi toàn app */}
      <ErrorBoundary>
        {/* provider hiển thị toast */}
        <ToastProvider>
          {/* fallback loading khi SQLite đang init */}
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
            {/* SQLite database provider */}
            <SQLiteProvider
              databaseName={DB_NAME}
              onInit={DatabaseManager.initialize}
              useSuspense
            >
              {/* Auth provider quản lý login/token/user */}
              <AuthProvider>
                {/* app chính */}
                <AppWithProviders />
              </AuthProvider>
            </SQLiteProvider>
          </Suspense>
        </ToastProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
