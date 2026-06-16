/**
 * Google Sign-In configuration
 * Spec §2.2
 *
 * Gọi initGoogleSignIn() một lần trong root layout trước khi app render.
 *
 * ⚠️  @react-native-google-signin/google-signin là native module — không chạy
 *     trong Expo Go. File này tự động detect môi trường và dùng mock stub khi
 *     chạy trong Expo Go để tránh crash.
 *     Để dùng Google Sign-In thật, build bằng: npx expo run:android
 */

import Constants from "expo-constants";

import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_ID_IOS } from "./constants";

// ─── Detect Expo Go ──────────────────────────────────────────────────────────

/**
 * true khi đang chạy trong Expo Go (không có native module).
 * false khi đang chạy trong Development Build hoặc Production.
 */
const IS_EXPO_GO =
  Constants.executionEnvironment === "storeClient" ||
  // Fallback cho các phiên bản Expo cũ hơn
  (Constants.appOwnership != null && Constants.appOwnership === "expo");

// ─── Types ───────────────────────────────────────────────────────────────────

export type StatusCodes = {
  SIGN_IN_CANCELLED: string;
  IN_PROGRESS: string;
  PLAY_SERVICES_NOT_AVAILABLE: string;
  SIGN_IN_REQUIRED: string;
};

// ─── Mock cho Expo Go ─────────────────────────────────────────────────────────

const MOCK_STATUS_CODES: StatusCodes = {
  SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
  IN_PROGRESS: "IN_PROGRESS",
  PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
  SIGN_IN_REQUIRED: "SIGN_IN_REQUIRED",
};

// ─── Export statusCodes ───────────────────────────────────────────────────────

let _statusCodes: StatusCodes = MOCK_STATUS_CODES;

if (!IS_EXPO_GO) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { statusCodes } = require("@react-native-google-signin/google-signin");
  _statusCodes = statusCodes;
}

export const statusCodes: StatusCodes = _statusCodes;

// ─── initGoogleSignIn ─────────────────────────────────────────────────────────

/**
 * Khởi tạo Google Sign-In SDK.
 * Phải gọi trước khi dùng bất kỳ method nào của GoogleSignin.
 * Trong Expo Go: no-op.
 */
export function initGoogleSignIn() {
  if (IS_EXPO_GO) {
    console.info(
      "[GoogleSignIn] Expo Go detected — Google Sign-In is mocked.\n" +
        "Run `npx expo run:android` for real Google Sign-In."
    );
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GoogleSignin } = require("@react-native-google-signin/google-signin");
  GoogleSignin.configure({
    webClientId: GOOGLE_CLIENT_ID,
    iosClientId: GOOGLE_CLIENT_ID_IOS || undefined,
    offlineAccess: false, // Không cần server auth code — chỉ cần id_token
  });
}

// ─── getGoogleIdToken ─────────────────────────────────────────────────────────

/**
 * Chạy Google Sign-In flow và trả về id_token.
 * Trả về null nếu user cancel.
 * Ném error nếu thiết bị không hỗ trợ hoặc có lỗi khác.
 *
 * Trong Expo Go: luôn ném error để thông báo cho developer.
 */
export async function getGoogleIdToken(): Promise<string | null> {
  if (IS_EXPO_GO) {
    throw new Error(
      "Google Sign-In không hoạt động trong Expo Go.\n" +
        "Hãy build app bằng lệnh: npx expo run:android"
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GoogleSignin } = require("@react-native-google-signin/google-signin");

  try {
    // Kiểm tra Google Play Services (Android only — iOS bỏ qua lỗi)
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Mở Google account picker
    await GoogleSignin.signIn();

    // Lấy id_token từ kết quả
    const { idToken } = await GoogleSignin.getTokens();

    if (!idToken) throw new Error("Không lấy được id_token từ Google");

    return idToken;
  } catch (error: unknown) {
    const err = error as { code?: string };

    if (err.code === statusCodes.SIGN_IN_CANCELLED) {
      // User tự cancel — không làm gì (spec §2.5)
      return null;
    }

    if (err.code === statusCodes.IN_PROGRESS) {
      // Đang có flow khác chạy — ignore
      return null;
    }

    if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error("Thiết bị không hỗ trợ Google Sign-In");
    }

    throw new Error("Đăng nhập Google thất bại. Vui lòng thử lại.");
  }
}

// ─── googleSignOutLocal ───────────────────────────────────────────────────────

/**
 * Sign out khỏi Google account cục bộ trên thiết bị.
 * Chỉ cần gọi khi user sign out thủ công.
 * Trong Expo Go: no-op.
 */
export async function googleSignOutLocal(): Promise<void> {
  if (IS_EXPO_GO) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { GoogleSignin } = require("@react-native-google-signin/google-signin");
    await GoogleSignin.signOut();
  } catch {
    // Ignore — không critical
  }
}
