import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, AppState } from "react-native";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { api, registerForceSignOut } from "@/lib/apiClient";
import { useSQLiteContext } from "expo-sqlite";
import { getGoogleIdToken, googleSignOutLocal } from "@/lib/googleSignIn";
import { getMyProfile } from "@/services/profileService";
import { pullInitialData } from "@/services/initialData.service";
import {
  clearTokens,
  getAppToken,
  getRefreshToken,
  isRefreshTokenValid,
  saveTokens,
} from "@/lib/tokenStorage";
import { API_BASE_URL, TOKEN_REFRESH_THRESHOLD_SECONDS } from "@/lib/constants";
import { clearUserData } from "@/lib/db";
import { clearProfileCache } from "@/services/profileService";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: number;
  google_id?: string;
  email: string;
  display_name: string;
  photo_url?: string;
  role: string;
  status: string;
}

interface AuthTokenResponse {
  app_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  is_first_login: boolean;
  user: UserProfile;
}

interface RefreshResponse {
  app_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
}

interface AuthContextValue {
  /** Profile của user đang đăng nhập, null nếu chưa auth */
  user: UserProfile | null;
  /** true trong lúc đang kiểm tra token lúc startup */
  isLoading: boolean;
  /** true khi auth đã hoàn tất hydration (token + user đã load xong) */
  isHydrated: boolean;
  /** Alias for isHydrated — used by screens to gate profile fetches */
  isInitialized: boolean;
  isAuthenticated: boolean;

  /** Đăng nhập bằng email + password (spec §2.4) */
  emailLogin(email: string, password: string): Promise<void>;
  /** Đăng ký tài khoản mới (spec §2.3) */
  register(email: string, password: string, displayName: string): Promise<void>;
  /** Đăng nhập bằng Google (spec §2.5) */
  googleSignIn(): Promise<void>;
  /** Sign-out thủ công (spec §2.10) */
  signOut(): Promise<void>;
  /** Force sign-out do auth failure (spec §2.9) — cũng được apiClient gọi */
  forceSignOut(): Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải được dùng trong <AuthProvider>");
  return ctx;
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────

/** Decode JWT payload mà không cần thư viện (spec §2.6 — "decode locally, no API call") */
function parseJwtExp(token: string): number | null {
  try {
    const base64 = token.split(".")[1];
    if (!base64) return null;
    // Pad base64 string to a multiple of 4
    const padded = base64.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4;
    const paddedStr = pad ? padded + "===".slice(0, 4 - pad) : padded;
    // atob is available globally in React Native Hermes and web
    const decoded = atob(paddedStr);
    const payload = JSON.parse(decoded) as { exp?: number };
    return payload.exp ?? null;
  } catch {
    return null;
  }
}

/** Trả về true nếu token còn hơn threshold giây */
function isTokenFresh(token: string): boolean {
  const exp = parseJwtExp(token);
  if (exp === null) return false;
  const nowSec = Date.now() / 1000;
  return exp > nowSec + TOKEN_REFRESH_THRESHOLD_SECONDS;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Track if this is a login flow (vs startup restore)
  const loginFlowRef = useRef(false);

  // Tránh double-run startup check (React 18 StrictMode)
  const startupRan = useRef(false);

  // Tránh concurrent profile checks chạy nhiều lần cùng lúc
  const profileCheckRef = useRef(false);

  // ── AppState listener (spec §11.6: pull data sau 30 phút ở background) ──
  const lastBackgroundTime = useRef<number>(0);

  useEffect(() => {
    lastBackgroundTime.current = Date.now();
  }, []);
  const isPullingRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        lastBackgroundTime.current = Date.now();
      } else if (nextAppState === "active") {
        const timeInBackground = Date.now() - lastBackgroundTime.current;
        // 30 phút = 30 * 60 * 1000 = 1800000 ms
        if (timeInBackground >= 1800000 && !isPullingRef.current) {
          isPullingRef.current = true;
          console.log(
            "[AuthContext] App in background for >30m. Pulling data...",
          );
          pullInitialData(db, user.id).finally(() => {
            isPullingRef.current = false;
          });
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user?.id, db]);

  // ── Helper: lưu token + cập nhật state ──────────────────────────────────
  const persistAuth = useCallback(async (resp: AuthTokenResponse) => {
    await saveTokens({
      appToken: resp.app_token,
      refreshToken: resp.refresh_token,
      refreshExpiresIn: resp.refresh_expires_in,
    });
    setUser(resp.user);
  }, []);

  // ── Navigation sau auth ──────────────────────────────────────────────────
  const navigateAfterAuth = useCallback(
    async (isFirstLogin: boolean) => {
      // Nếu là lần đầu login -> vào onboarding
      if (isFirstLogin) {
        router.replace("/welcome-setup");
        return;
      }

      // [AuthState] tokenExists=... user.id=... hydrated=...
      const appToken = await getAppToken().catch(() => null);
      console.log(
        `[AuthState] tokenExists=${!!appToken} userId=${user?.id} hydrated=${isHydrated}`,
      );

      // Rule B: Kiểm tra profile trước khi vào home
      // để đảm bảo onboarding_done = true
      // Prevent duplicate concurrent checks
      if (profileCheckRef.current) return;
      profileCheckRef.current = true;

      try {
        const profile = await getMyProfile({
          file: "AuthContext.tsx",
          route: "navigateAfterAuth",
        });
        console.log(
          `[ProfileCheck] navigateAfterAuth onboarding_done=${profile.onboarding_done}`,
        );
        if (profile.onboarding_done) {
          router.replace("/(tabs)/home");
        } else {
          console.log(
            "[ProfileCheck] navigateAfterAuth redirecting to welcome-setup",
          );
          router.replace("/welcome-setup");
        }
      } catch (error: any) {
        // Rule E: 404 = profile chưa tồn tại -> vào onboarding
        if (error?.status === 404) {
          console.log(
            "[ProfileCheck] navigateAfterAuth 404, redirecting to welcome-setup",
          );
          router.replace("/welcome-setup");
        } else {
          // Lỗi khác -> vẫn vào home, để home screen xử lý
          console.warn("[AuthContext] Profile check failed after auth:", error);
          router.replace("/(tabs)/home");
        }
      } finally {
        profileCheckRef.current = false;
      }
    },
    [user?.id, isHydrated],
  );

  // ── Effect: tự động navigate sau khi auth hydration hoàn tất ────────────
  // Chỉ chạy khi có login flow (không chạy khi startup restore)
  useEffect(() => {
    if (!isHydrated || !user) return;
    if (!loginFlowRef.current) return;

    console.log(
      `[AuthHydration] login flow complete user.id=${user.id} hydrated=${isHydrated}`,
    );

    // Reset flag và navigate
    loginFlowRef.current = false;
    // navigateAfterAuth sẽ được gọi bởi login methods
  }, [isHydrated, user?.id]);

  // ── Effect: tự động redirect sau startup restore ─────────────────────────
  //    Luồng:
  //      checkAuth() → setUser(profile) → setIsHydrated(true)
  //      → React re-render → effect này chạy
  //      → navigateAfterAuth(false) → router.replace("/(tabs)/home")
  //
  useEffect(() => {
    if (!isHydrated || !user) return;
    if (loginFlowRef.current) return;

    console.log(
      `[AuthHydration] startup restore — navigating with user.id=${user.id}`,
    );

    // Dùng setTimeout để đảm bảo SplashScreen đã hide xong
    // Tránh lỗi "Cannot replace screen while splash screen is showing"
    setTimeout(() => {
      navigateAfterAuth(false);
    }, 100);
  }, [isHydrated, user, navigateAfterAuth]);

  // ── Effect: tự động pull dữ liệu ban đầu khi auth thành công ─────────────
  const hasPulledRef = useRef(false);

  useEffect(() => {
    if (!isHydrated || !user?.id) {
      hasPulledRef.current = false; // Reset khi sign out
      return;
    }
    if (hasPulledRef.current) return;
    hasPulledRef.current = true;
    
    console.log(`[AuthContext] Triggers pullInitialData for user=${user.id}`);
    pullInitialData(db, user.id).catch((err) => {
      console.error("[AuthContext] pullInitialData error:", err);
    });
  }, [isHydrated, user?.id, db]);


  // ── Force sign-out (spec §2.9) ────────────────────────────────────────────
  // FIX: Dùng user?.id thay vì user (object) để tránh
  // react-hooks/exhaustive-deps warning
  // Chỉ cần userId của user hiện tại để clear cache
  const forceSignOut = useCallback(async () => {
    // Lưu userId trước khi clear
    const userId = user?.id;
    await clearTokens();
    clearProfileCache();
    // Xóa SQLite data nếu biết userId
    if (userId) {
      await clearUserData(db, userId).catch(() => {});
    }
    setUser(null);
    setIsHydrated(false);
    // Spec: hiển thị thông báo phiên hết hạn
    router.replace("/auth");
    setTimeout(() => {
      Alert.alert(
        "Phiên đăng nhập hết hạn",
        "Vui lòng đăng nhập lại để tiếp tục.",
        [{ text: "OK" }],
      );
    }, 500);
  }, [user?.id]);

  // Đăng ký callback cho apiClient để gọi khi refresh thất bại
  useEffect(() => {
    registerForceSignOut(forceSignOut);
  }, [forceSignOut]);

  // ── App startup check (spec §2.6) ─────────────────────────────────────────
  // FIX: Dùng user?.id thay vì user (object) trong deps array
  // Tránh effect chạy lại mỗi khi user object thay đổi reference
  // (xảy ra khi setUser được gọi với object mới)
  useEffect(() => {
    if (startupRan.current) return;
    startupRan.current = true;

    async function checkAuth() {
      console.log("[AuthHydration] start");
      try {
        const appToken = await getAppToken();

        if (!appToken) {
          // Không có token → về màn đăng nhập
          router.replace("/auth");
          // Không set isHydrated — để guard các screen không fetch linh tinh
          return;
        }

        if (isTokenFresh(appToken)) {
          // Token còn đủ hạn → lấy user info
          try {
            const profile = await api.get<UserProfile>("/auth/me");
            setUser(profile);
            // Chỉ set hydrated khi user đã được restore thành công
            setIsHydrated(true);
          } catch {
            // Không thể lấy profile → không set hydrated, user ở lại loading
            // Các guard screen sẽ dừng fetch cho đến khi auth ổn định
            console.warn("[AuthHydration] Failed to restore user — staying in loading");
          }

          console.log(
            `[AuthHydration] user.id=${user?.id} hydrated=${isHydrated}`,
          );

          // Không gọi getMyProfile ở đây nữa
          // Để _layout.tsx hoặc home.tsx tự fetch khi cần
          return;
        }

        // Token sắp hết hạn → thử silent refresh (spec §2.7)
        const refreshValid = await isRefreshTokenValid();
        const refreshToken = await getRefreshToken();

        if (!refreshValid || !refreshToken) {
          await forceSignOut();
          return;
        }

        try {
          const resp = await api.post<RefreshResponse>("/auth/refresh", {
            refresh_token: refreshToken,
          });

          await saveTokens({
            appToken: resp.app_token,
            refreshToken: resp.refresh_token,
            refreshExpiresIn: resp.refresh_expires_in,
          });

          // Sau refresh thành công → lấy user info
          const profile = await api.get<UserProfile>("/auth/me");
          setUser(profile);
          // Chỉ set hydrated khi user đã được restore thành công
          setIsHydrated(true);

          console.log(
            `[AuthHydration] user restored after refresh — user.id=${user?.id}`,
          );
        } catch {
          await forceSignOut();
        }
      } finally {
        setIsLoading(false);
        // KHÔNG set isHydrated ở finally — chỉ set khi user confirmed
        // Tránh race: screen fetch API trước khi user/onboarding sẵn sàng
        console.log(
          `[AuthHydration] done loading=${false} hydrated=${isHydrated} user.id=${user?.id}`,
        );
        SplashScreen.hideAsync();
      }
    }

    checkAuth();
  }, [forceSignOut, user?.id, isHydrated]);

  // ── Email Login (spec §2.4) ────────────────────────────────────────────────
  const emailLogin = useCallback(
    async (email: string, password: string) => {
      const resp = await api.post<AuthTokenResponse>("/auth/login", {
        email,
        password,
      });
      await persistAuth(resp);

      // Đánh dấu đây là login flow
      loginFlowRef.current = true;

      // Gọi navigateAfterAuth trực tiếp
      // (isHydrated đã true từ startup check)
      await navigateAfterAuth(resp.is_first_login);
    },
    [persistAuth, navigateAfterAuth],
  );

  // ── Register (spec §2.3) ──────────────────────────────────────────────────
  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const resp = await api.post<AuthTokenResponse>("/auth/register", {
        email,
        password,
        display_name: displayName,
      });
      await persistAuth(resp);
      // is_first_login luôn true khi register (spec §2.3)
      router.replace("/welcome-setup");
    },
    [persistAuth],
  );

  // ── Google Sign-In (spec §2.5) ────────────────────────────────────────────
  const googleSignIn = useCallback(async () => {
    try {
      const idToken = await getGoogleIdToken();

      // user bấm cancel → không làm gì
      if (!idToken) return;

      // gửi Google id_token lên backend để login
      const resp = await api.post<AuthTokenResponse>("/auth/google", {
        id_token: idToken,
      });

      // lưu token + user vào storage/context
      await persistAuth(resp);

      // Đánh dấu đây là login flow
      loginFlowRef.current = true;

      // điều hướng sau login
      // chỉ cần truyền is_first_login
      await navigateAfterAuth(resp.is_first_login);
    } catch (error: any) {
      // log lỗi để debug
      console.error("Google SignIn Error:", error);

      // show lỗi cho user
      Alert.alert("Lỗi đăng nhập", error?.message || JSON.stringify(error));
    }
  }, [persistAuth, navigateAfterAuth]);

  // ── Manual Sign-Out (spec §2.10) ──────────────────────────────────────────
  // Dùng user?.id thay vì user (object) để tránh
  // react-hooks/exhaustive-deps warning
  // Chỉ cần userId để clear SQLite data của user hiện tại
  const performSignOut = useCallback(async () => {
    const currentUserId = user?.id;
    const refreshToken = await getRefreshToken();
    const appToken = await getAppToken();

    // Fire-and-forget POST /auth/signout (spec §2.10 — không chờ response)
    if (refreshToken && appToken) {
      fetch(`${API_BASE_URL}/auth/signout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${appToken}`,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }).catch(() => {
        /* ignore */
      });
    }

    // Xóa toàn bộ SQLite data của user
    if (currentUserId) {
      await clearUserData(db, currentUserId).catch(() => {});
    }

    // Xóa AsyncStorage profile cache
    clearProfileCache();

    // Sign out Google (cục bộ)
    await googleSignOutLocal();

    // Xóa tokens
    await clearTokens();
    setUser(null);
    setIsHydrated(false);

    router.replace("/auth");
  }, [user?.id]);

  const signOut = useCallback(async () => {
    // Kiểm tra sync_queue (spec §2.10)
    try {
      const result = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM sync_queue WHERE status IN ('pending', 'failed', 'processing')",
      );

      if (result && result.count > 0) {
        return new Promise<void>((resolve) => {
          Alert.alert(
            "Chưa đồng bộ",
            `Bạn còn ${result.count} mục chưa được đồng bộ.\nNếu đăng xuất ngay, dữ liệu này sẽ bị mất.`,
            [
              {
                text: "Đồng bộ rồi đăng xuất",
                style: "default",
                onPress: () => {
                  // Sẽ kích hoạt sync (được quản lý bởi NetworkContext) rồi user bấm sign out lại
                  // Hoặc nếu muốn force sync ở đây thì cần inject SyncService
                  // Tạm thời chỉ dismiss dialog
                  resolve();
                },
              },
              {
                text: "Đăng xuất ngay",
                style: "destructive",
                onPress: () => performSignOut().then(resolve),
              },
            ],
          );
        });
      }
    } catch {
      // Bỏ qua lỗi db
    }

    await performSignOut();
  }, [db, performSignOut]);

  const value: AuthContextValue = {
    user,
    isLoading,
    isHydrated,
    isInitialized: isHydrated,
    isAuthenticated: user !== null,
    emailLogin,
    register,
    googleSignIn,
    signOut,
    forceSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
