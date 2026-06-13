/**
 * Token Storage — expo-secure-store wrapper
 *
 * Spec §2.1 — Token storage keys:
 *   nutrimind_app_token          JWT dùng để gọi API (Authorization: Bearer ...)
 *   nutrimind_refresh_token      Dùng để lấy token pair mới khi app_token hết hạn
 *   nutrimind_refresh_expires_at ISO8601 — thời điểm refresh_token hết hạn
 */
import * as SecureStore from "expo-secure-store";

const KEYS = {
  APP_TOKEN: "nutrimind_app_token",
  REFRESH_TOKEN: "nutrimind_refresh_token",
  REFRESH_EXPIRES_AT: "nutrimind_refresh_expires_at",
} as const;

export interface TokenSet {
  appToken: string;
  refreshToken: string;
  /** refresh_expires_in trả về từ server (giây) — sẽ convert sang ISO8601 và lưu */
  refreshExpiresIn: number;
}

/**
 * Lưu cả 3 token keys vào SecureStore.
 * refresh_expires_at = now() + refreshExpiresIn (seconds) → ISO8601
 */
export async function saveTokens(tokens: TokenSet): Promise<void> {
  const expiresAt = new Date(
    Date.now() + tokens.refreshExpiresIn * 1000
  ).toISOString();

  await Promise.all([
    SecureStore.setItemAsync(KEYS.APP_TOKEN, tokens.appToken),
    SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, tokens.refreshToken),
    SecureStore.setItemAsync(KEYS.REFRESH_EXPIRES_AT, expiresAt),
  ]);
}

/** Đọc app_token (JWT dùng cho API calls). Trả về null nếu không tồn tại. */
export async function getAppToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.APP_TOKEN);
}

/** Đọc refresh_token. Trả về null nếu không tồn tại. */
export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
}

/**
 * Đọc refresh_expires_at dưới dạng Date.
 * Trả về null nếu không tồn tại hoặc parse thất bại.
 */
export async function getRefreshExpiresAt(): Promise<Date | null> {
  const raw = await SecureStore.getItemAsync(KEYS.REFRESH_EXPIRES_AT);
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Xóa cả 3 keys — dùng khi sign-out (force hoặc thủ công).
 * Spec §2.9, §2.10
 */
export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.APP_TOKEN),
    SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
    SecureStore.deleteItemAsync(KEYS.REFRESH_EXPIRES_AT),
  ]);
}

/**
 * Kiểm tra refresh_token còn hạn không.
 * Trả về false nếu không tồn tại hoặc đã hết hạn.
 */
export async function isRefreshTokenValid(): Promise<boolean> {
  const expiresAt = await getRefreshExpiresAt();
  if (!expiresAt) return false;
  return expiresAt.getTime() > Date.now();
}
