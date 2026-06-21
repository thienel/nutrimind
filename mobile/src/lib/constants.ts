
/** Base URL của NutriMind backend API (không có trailing slash) */
const _envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://168.144.44.209:8000";
export const API_BASE_URL = _envBaseUrl.endsWith("/api/v1") ? _envBaseUrl : `${_envBaseUrl}/api/v1`;

/** Web / Android Google OAuth Client ID */
export const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ??
  "554505712919-d4h8is1kpd4eg6fu43qk560rqm7hrc72.apps.googleusercontent.com";

/** iOS Google OAuth Client ID */
export const GOOGLE_CLIENT_ID_IOS =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ??
  "554505712919-q2fa9c9hhff9c1r6t700lmb0boj5p9g2.apps.googleusercontent.com";

/** Số giây còn lại của app_token để bắt đầu silent refresh (spec §2.6) */
export const TOKEN_REFRESH_THRESHOLD_SECONDS = 300; // 5 phút
