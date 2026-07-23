/**
 * Google Sign-In configuration (Native Client)
 */

import { GoogleSignin, isErrorWithCode, statusCodes } from "@react-native-google-signin/google-signin";
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_ID_IOS } from "./constants";

export function initGoogleSignIn() {
  GoogleSignin.configure({
    webClientId: GOOGLE_CLIENT_ID, // Use the web client ID from constants
    iosClientId: GOOGLE_CLIENT_ID_IOS,
    offlineAccess: true,
  });
}

export async function getGoogleIdToken(): Promise<string | null> {
  try {
    // Check if your device supports Google Play
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    
    // Get the users ID token
    const result = await GoogleSignin.signIn();
    
    if (result.type === "success" && result.data?.idToken) {
        return result.data.idToken;
    }

    if (result.type === "cancelled") {
        return null;
    }
    
    throw new Error("Không nhận được id_token sau khi đăng nhập.");
  } catch (error: any) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return null; // user cancelled the login flow
      } else if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error("Đăng nhập đang được xử lý."); // operation (e.g. sign in) is in progress already
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error("Google Play Services không khả dụng."); // play services not available or outdated
      }
    }
    console.error("Google Login Error:", error);
    throw new Error("Đăng nhập Google thất bại. Vui lòng thử lại.");
  }
}

export async function googleSignOutLocal(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.error("Google Sign Out Error:", error);
  }
}
