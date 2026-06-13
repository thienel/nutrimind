/**
 * Google Sign-In configuration
 * Spec §2.2
 *
 * Gọi initGoogleSignIn() một lần trong root layout trước khi app render.
 */

import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_ID_IOS } from "./constants";

export { statusCodes };

/**
 * Khởi tạo Google Sign-In SDK.
 * Phải gọi trước khi dùng bất kỳ method nào của GoogleSignin.
 */
export function initGoogleSignIn() {
  GoogleSignin.configure({
    webClientId: GOOGLE_CLIENT_ID,
    iosClientId: GOOGLE_CLIENT_ID_IOS || undefined,
    offlineAccess: false, // Không cần server auth code — chỉ cần id_token
  });
}

/**
 * Chạy Google Sign-In flow và trả về id_token.
 * Trả về null nếu user cancel.
 * Ném error nếu thiết bị không hỗ trợ hoặc có lỗi khác.
 */
export async function getGoogleIdToken(): Promise<string | null> {
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

/**
 * Sign out khỏi Google account cục bộ trên thiết bị.
 * Chỉ cần gọi khi user sign out thủ công.
 */
export async function googleSignOutLocal(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Ignore — không critical
  }
}
