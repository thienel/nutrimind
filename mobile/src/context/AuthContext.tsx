import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { api, registerForceSignOut } from "@/lib/apiClient";
import { useSQLiteContext } from "expo-sqlite";
import { getGoogleIdToken, googleSignOutLocal } from "@/lib/googleSignIn";
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
import { clearProfileCache } from "@/hooks/useOfflineProfile";

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
  isAuthenticated: boolean;

  /** Đăng nhập bằng email + password (spec §2.4) */
  emailLogin(email: string, password: string): Promise<void>;
  /** Đăng ký tài khoản mới (spec §2.3) */
  register(
    email: string,
    password: string,
    displayName: string
  ): Promise<void>;
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

  // Tránh double-run startup check (React 18 StrictMode)
  const startupRan = useRef(false);

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
    async (isFirstLogin: boolean, userId?: number) => {
      if (isFirstLogin) {
        router.replace("/welcome-setup");
        return;
      }

      // Pull initial data từ server (spec §2.8) — nếu 403 ONBOARDING_REQUIRED → onboarding
      try {
        if (userId) {
          await pullInitialData(db, userId);
        } else {
          await api.get("/profile");
        }
        router.replace("/(tabs)/home");
      } catch (err: unknown) {
        const e = err as { status?: number };
        if (e?.status === 403) {
          router.replace("/welcome-setup");
        } else {
          // Network error nhưng token ok → vào home với data local
          router.replace("/(tabs)/home");
        }
      }
    },
    [db]
  );

  // ── Force sign-out (spec §2.9) ────────────────────────────────────────────
  const forceSignOut = useCallback(async () => {
    // Xóa token và profile cache
    const currentUser = user;
    await clearTokens();
    await clearProfileCache().catch(() => { });
    // Xóa SQLite data nếu biết userId
    if (currentUser?.id) {
      await clearUserData(currentUser.id).catch(() => { });
    }
    setUser(null);
    // Spec: hiển thị thông báo phiên hết hạn
    router.replace("/auth");
    setTimeout(() => {
      Alert.alert(
        "Phiên đăng nhập hết hạn",
        "Vui lòng đăng nhập lại để tiếp tục.",
        [{ text: "OK" }]
      );
    }, 500);
  }, [user]);

  // Đăng ký callback cho apiClient để gọi khi refresh thất bại
  useEffect(() => {
    registerForceSignOut(forceSignOut);
  }, [forceSignOut]);

  // ── App startup check (spec §2.6) ─────────────────────────────────────────
  useEffect(() => {
    if (startupRan.current) return;
    startupRan.current = true;

    async function checkAuth() {
      try {
        const appToken = await getAppToken();

        if (!appToken) {
          // Không có token → về màn đăng nhập
          router.replace("/auth");
          return;
        }

        if (isTokenFresh(appToken)) {
          // Token còn đủ hạn → pull profile (background, không block UI)
          try {
            const profile = await api.get<UserProfile>("/auth/me");
            setUser(profile);
            // Kiểm tra onboarding & pull initial data
            try {
              await pullInitialData(db, profile.id);
              router.replace("/(tabs)/home");
            } catch (err: unknown) {
              const e = err as { status?: number };
              if (e?.status === 403) {
                router.replace("/welcome-setup");
              } else {
                router.replace("/(tabs)/home");
              }
            }
          } catch {
            // Có thể offline → vào home với data local
            router.replace("/(tabs)/home");
          }
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

          // Sau refresh thành công → pull initial data
          const profile = await api.get<UserProfile>("/auth/me");
          setUser(profile);

          try {
            await pullInitialData(db, profile.id);
            router.replace("/(tabs)/home");
          } catch (err: unknown) {
            const e = err as { status?: number };
            if (e?.status === 403) {
              router.replace("/welcome-setup");
            } else {
              router.replace("/(tabs)/home");
            }
          }
        } catch {
          await forceSignOut();
        }
      } finally {
        setIsLoading(false);
        SplashScreen.hideAsync();
      }
    }

    checkAuth();
  }, [forceSignOut]);

  // ── Email Login (spec §2.4) ────────────────────────────────────────────────
  const emailLogin = useCallback(
    async (email: string, password: string) => {
      const resp = await api.post<AuthTokenResponse>("/auth/login", {
        email,
        password,
      });
      await persistAuth(resp);
      await navigateAfterAuth(resp.is_first_login, resp.user.id);
    },
    [persistAuth, navigateAfterAuth]
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
    [persistAuth]
  );

  // ── Google Sign-In (spec §2.5) ────────────────────────────────────────────
  const googleSignIn = useCallback(async () => {
    const idToken = await getGoogleIdToken();
    if (!idToken) return; // User cancel → không làm gì

    const resp = await api.post<AuthTokenResponse>("/auth/google", {
      id_token: idToken,
    });
    await persistAuth(resp);
    await navigateAfterAuth(resp.is_first_login, resp.user.id);
  }, [persistAuth, navigateAfterAuth]);

  // ── Manual Sign-Out (spec §2.10) ──────────────────────────────────────────
  const signOut = useCallback(async () => {
    // Kiểm tra sync_queue (spec §2.10)
    try {
      const result = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM sync_queue WHERE status IN ('pending', 'failed')"
      );
      
      if (result && result.count > 0) {
        return new Promise<void>((resolve) => {
          Alert.alert(
            "Chưa đồng bộ",
            `Bạn còn ${result.count} mục chưa được đồng bộ.\nNếu đăng xuất ngay, dữ liệu này sẽ bị mất.`,
            [
              { text: "Đồng bộ rồi đăng xuất", style: "default", onPress: () => {
                // Sẽ kích hoạt sync (được quản lý bởi NetworkContext) rồi user bấm sign out lại
                // Hoặc nếu muốn force sync ở đây thì cần inject SyncService
                // Tạm thời chỉ dismiss dialog
                resolve();
              } },
              { text: "Đăng xuất ngay", style: "destructive", onPress: () => performSignOut().then(resolve) }
            ]
          );
        });
      }
    } catch {
      // Bỏ qua lỗi db
    }

    await performSignOut();
  }, [db]);

  const performSignOut = useCallback(async () => {
    const currentUser = user;
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
    if (currentUser?.id) {
      await clearUserData(currentUser.id).catch(() => { });
    }

    // Xóa AsyncStorage profile cache
    await clearProfileCache().catch(() => { });

    // Sign out Google (cục bộ)
    await googleSignOutLocal();

    // Xóa tokens
    await clearTokens();
    setUser(null);

    router.replace("/auth");
  }, [user]);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    emailLogin,
    register,
    googleSignIn,
    signOut,
    forceSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
