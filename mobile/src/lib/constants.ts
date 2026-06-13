/**
 * App-wide constants — đọc từ biến môi trường (.env)
 *
 * Expo tự load file .env. Biến phải có prefix EXPO_PUBLIC_ để được bundle vào app.
 * Cách đặt giá trị: chỉnh file .env ở root của mobile/ (không cần restart bundler).
 *
 * Xem .env.example để biết các biến cần thiết.
 */

/** Base URL của NutriMind backend API (không có trailing slash) */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://10.0.2.2:8080/api/v1";

/** Web / Android Google OAuth Client ID */
export const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";

/** iOS Google OAuth Client ID */
export const GOOGLE_CLIENT_ID_IOS =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ?? "";

/** Số giây còn lại của app_token để bắt đầu silent refresh (spec §2.6) */
export const TOKEN_REFRESH_THRESHOLD_SECONDS = 300; // 5 phút
