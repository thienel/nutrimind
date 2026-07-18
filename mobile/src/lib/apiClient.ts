/**
 * API Client — fetch wrapper với 401 interceptor & silent refresh
 *
 * Spec §2.11 — Interceptor API cho 401:
 * - Bắt 401 trên bất kỳ request nào
 * - Gọi silentRefresh() (singleton — tránh concurrent refresh)
 * - Nếu refresh thành công: retry request gốc với token mới
 * - Nếu thất bại: gọi forceSignOut()
 *
 * Dùng fetch native thay axios vì chưa install axios.
 * Nếu muốn chuyển sang axios: cài `axios` và dùng axios.interceptors.response.
 */

import { API_BASE_URL } from "./constants";
import {
  clearTokens,
  getAppToken,
  getRefreshToken,
  isRefreshTokenValid,
  saveTokens,
} from "./tokenStorage";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  status: number;
  code?: string;
  message: string;
}

// ─── Force sign-out callback ─────────────────────────────────────────────────
// AuthContext sẽ register callback này. apiClient gọi nó khi refresh thất bại.
let _forceSignOutCallback: (() => Promise<void>) | null = null;

export function registerForceSignOut(fn: () => Promise<void>) {
  _forceSignOutCallback = fn;
}

// ─── Silent refresh — singleton pattern ──────────────────────────────────────
// Đảm bảo chỉ có 1 refresh đang chạy tại một thời điểm (spec §2.11 note)
let _refreshPromise: Promise<string | null> | null = null;

async function _doRefresh(): Promise<string | null> {
  try {
    // 1. Kiểm tra refresh_token còn hạn không (spec §2.7)
    const valid = await isRefreshTokenValid();
    if (!valid) return null;

    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;

    // 2. Gọi POST /auth/refresh
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) return null;

    const body = await res.json();
    const d = body.data ?? body; // backend có thể wrap trong {success, data}

    // 3. Lưu token pair mới vào SecureStore (spec §2.7 — token rotation)
    await saveTokens({
      appToken: d.app_token,
      refreshToken: d.refresh_token,
      refreshExpiresIn: d.refresh_expires_in,
    });

    return d.app_token as string;
  } catch {
    return null;
  }
}

async function silentRefresh(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = _doRefresh().finally(() => {
    _refreshPromise = null;
  });
  return _refreshPromise;
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Internal — set true khi đây là retry sau 401, tránh vòng lặp */
  _retry?: boolean;
}

/**
 * Gửi HTTP request tới NutriMind backend.
 * Tự động attach Bearer token và xử lý 401 silent refresh.
 *
 * @param path   Path bắt đầu bằng "/" (ví dụ: "/auth/me")
 * @param options Fetch options, hỗ trợ body là object (tự JSON.stringify)
 */
export async function request<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, _retry = false, ...rest } = options;

  // Attach Authorization header
  const appToken = await getAppToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(appToken ? { Authorization: `Bearer ${appToken}` } : {}),
    ...(rest.headers as Record<string, string>),
  };

  // [API] Request tracing for profile endpoints
  if (path.includes("/profile")) {
    console.log(
      `[API] ${options.method || "GET"} ${path} tokenExists=${!!appToken}`,
    );
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // ── 401 handler (spec §2.11) ─────────────────────────────────────────────
  if (res.status === 401 && !_retry) {
    const newToken = await silentRefresh();

    if (newToken) {
      // Retry request gốc với token mới
      return request<T>(path, { ...options, _retry: true });
    } else {
      // Refresh thất bại
      // Chỉ force sign-out nếu request này CÓ gửi token (tức là user đang đăng nhập)
      // Nếu appToken = null, có nghĩa là user đã logout (hoặc chưa từng login),
      // thì không được gọi _forceSignOutCallback (tránh wipe data của session mới)
      if (appToken) {
        await clearTokens();
        if (_forceSignOutCallback) {
          await _forceSignOutCallback();
        }
      }
      throw { status: 401, message: "Phiên đăng nhập đã hết hạn" } as ApiError;
    }
  }

  // ── Parse response ────────────────────────────────────────────────────────
  //
  // Backend trả response theo format chuẩn:
  //   { is_success: boolean, data: any, error?: { code?: string, message?: string } }
  //
  // Luôn check is_success TRƯỚC khi lấy data.
  //    - is_success === true  → unwrap json.data và trả về
  //    - is_success === false → throw error từ json.error
  //    - Trường hợp không có is_success (endpoint cũ) → fallback json.data ?? json
  //
  let json: Record<string, unknown>;

  try {
    json = await res.json();
  } catch {
    throw { status: res.status, message: res.statusText } as ApiError;
  }

  if (!res.ok) {
    // Backend gửi lỗi trong: response.error.message
    const errPayload = (
      json?.error !== undefined ? (json.error as Record<string, unknown>) : null
    ) as { code?: string; message?: string } | null;
    throw {
      status: res.status,
      code: errPayload?.code ?? (json.code as string),
      message:
        errPayload?.message ??
        (json.message as string) ??
        res.statusText ??
        "Đã có lỗi xảy ra",
    } as ApiError;
  }

  // ── (B) Application-level error (HTTP 200 nhưng backend từ chối) ──────────
  // Trường hợp này hay gặp khi backend validate business logic:
  //   HTTP 200, { is_success: false, error: { message: "...", code: "..." } }
  // Frontend cũ không bắt được → tưởng thành công.
  if (json?.is_success === false) {
    const errPayload = (
      json?.error !== undefined ? (json.error as Record<string, unknown>) : null
    ) as { code?: string; message?: string } | null;
    throw {
      status: res.status, // vẫn giữ status (200) để service có thể log
      code: errPayload?.code,
      message:
        errPayload?.message ??
        (json.message as string) ??
        "Yêu cầu không thành công",
    } as ApiError;
  }

  // ── (C) Success — unwrap data ─────────────────────────────────────────────
  // Backend trả: { is_success: true, data: { ... } }
  // Ta unwrap data để service không cần làm việc này.
  if (json?.is_success === true) {
    return json.data as T;
  }

  // ── (D) Fallback — endpoint không dùng is_success wrapper ─────────────────
  // Một số endpoint cũ hoặc không theo chuẩn có thể trả thẳng object.
  // Giữ logic cũ để không phá vỡ những endpoint này.
  return (json?.data ?? json) as T;
}

// ─── Convenience methods ──────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string, init?: RequestOptions) =>
    request<T>(path, { method: "GET", ...init }),

  post: <T>(path: string, body?: unknown, init?: RequestOptions) =>
    request<T>(path, { method: "POST", body, ...init }),

  put: <T>(path: string, body?: unknown, init?: RequestOptions) =>
    request<T>(path, { method: "PUT", body, ...init }),

  patch: <T>(path: string, body?: unknown, init?: RequestOptions) =>
    request<T>(path, { method: "PATCH", body, ...init }),

  delete: <T>(path: string, init?: RequestOptions) =>
    request<T>(path, { method: "DELETE", ...init }),
};
