/**
 * Google Sign-In configuration (Ultimate Web-based Bypass - Authorization Code Flow)
 *
 * Sử dụng iOS Client ID trên nền WebBrowser với luồng PKCE chuẩn.
 * 1. Mở WebBrowser với iOS Client ID -> được Google chấp nhận custom scheme.
 * 2. Lấy Authorization Code (iOS Client ID không hỗ trợ trả về thẳng id_token).
 * 3. Đổi Code lấy id_token ẩn dưới nền.
 */

import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { GOOGLE_CLIENT_ID_IOS } from "./constants";

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

export function initGoogleSignIn() {
  // No-op
}

export async function getGoogleIdToken(): Promise<string | null> {
  try {
    const clientId = GOOGLE_CLIENT_ID_IOS;

    if (!clientId) {
      throw new Error("Thiếu cấu hình GOOGLE_CLIENT_ID_IOS");
    }

    const reversedClientId = clientId.split(".").reverse().join(".");
    const redirectUri = `${reversedClientId}:/oauth2redirect/google`;

    // Sử dụng Code Flow thay vì Implicit Flow
    const request = new AuthSession.AuthRequest({
      clientId,
      scopes: ["openid", "profile", "email"],
      redirectUri,
      responseType: AuthSession.ResponseType.Code, // Bắt buộc là Code cho iOS/Android Client ID
      usePKCE: true, // Native Client ID bắt buộc dùng PKCE
    });

    const result = await request.promptAsync(discovery);

    if (result.type === "success") {
      const { code } = result.params;
      
      // Đổi Authorization Code lấy Tokens (bao gồm id_token)
      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          code,
          clientId,
          redirectUri,
          extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
        },
        discovery
      );

      if (tokenResult.idToken) {
        return tokenResult.idToken;
      }
      
      throw new Error("Không nhận được id_token sau khi đổi Code.");
    }

    if (result.type === "cancel" || result.type === "dismiss") {
      return null;
    }

    throw new Error("Đăng nhập thất bại (type: " + result.type + ")");
  } catch (error) {
    console.error("Google Web Login Error:", error);
    throw new Error("Đăng nhập Google thất bại. Vui lòng thử lại.");
  }
}

export async function googleSignOutLocal(): Promise<void> {
  // No-op
}
