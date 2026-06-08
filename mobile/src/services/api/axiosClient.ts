import axios, { type InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Config } from '@shared/constants/config';
import type { ApiResponse, RefreshTokenResponse } from '@t/api.types';

// ---------------------------------------------------------------------------
// Secure storage keys
// ---------------------------------------------------------------------------
let inMemoryAppToken: string | null = null;
export const SECURE_STORE_KEYS = {
	APP_TOKEN: 'nutrimind_app_token',
	REFRESH_TOKEN: 'nutrimind_refresh_token',
	TOKEN_EXPIRES_AT: 'nutrimind_token_expires_at',    // Unix timestamp ms (string)
	ONBOARDING_COMPLETE: 'nutrimind_onboarding_complete',
} as const;

/**
 * @deprecated Import `ApiResponse` from `@t/api.types` instead.
 * Kept for backward compatibility with existing code.
 */
export type { ApiResponse };

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

const axiosClient = axios.create({
	baseURL: Config.API_URL,
	timeout: 10_000,
	headers: { 'Content-Type': 'application/json' },
});

// ---------------------------------------------------------------------------
// Request interceptor — attach Bearer token
// ---------------------------------------------------------------------------

axiosClient.interceptors.request.use(async (config) => {
	// Ưu tiên đọc từ RAM trước (chỉ tốn 1 nano-giây)
	let token = inMemoryAppToken;

	// Nếu trong RAM rỗng (ví dụ app vừa bật lên) thì mới đọc từ Secure Store
	if (!token) {
		token = await SecureStore.getItemAsync(SECURE_STORE_KEYS.APP_TOKEN);
		inMemoryAppToken = token; // Cập nhật lại vào RAM
	}
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

// ---------------------------------------------------------------------------
// Response interceptor — 401 silent re-auth & error normalization
// ---------------------------------------------------------------------------

/**
 * Custom error class with backend error details.
 * Thrown by the response interceptor for structured error handling.
 */
export class ApiError extends Error {
	code: string;
	status: number;
	fields?: { field: string; message: string }[];

	constructor(
		message: string,
		code: string,
		status: number,
		fields?: { field: string; message: string }[],
	) {
		super(message);
		this.name = 'ApiError';
		this.code = code;
		this.status = status;
		this.fields = fields;
	}
}

// ---------------------------------------------------------------------------
// Silent refresh state — prevent multiple concurrent refresh calls
// ---------------------------------------------------------------------------

/** Whether a token refresh is already in flight. */
let isRefreshing = false;

/**
 * Queue of resolve/reject callbacks from requests that arrived while a
 * refresh was already in-flight. They are drained after the refresh settles.
 */
let pendingQueue: Array<{
	resolve: (token: string) => void;
	reject: (err: unknown) => void;
}> = [];

function drainQueue(newToken: string | null, err: unknown = null): void {
	for (const { resolve, reject } of pendingQueue) {
		if (newToken) resolve(newToken);
		else reject(err);
	}
	pendingQueue = [];
}

/**
 * Persist a new token pair received from the refresh endpoint.
 * Exported so `authService.ts` can call the same helper on initial sign-in.
 */
export async function persistTokens(
	appToken: string,
	refreshToken: string,
	appExpiresInSeconds: number,
): Promise<void> {
	inMemoryAppToken = appToken;
	const expiresAt = Date.now() + appExpiresInSeconds * 1000;
	await Promise.all([
		SecureStore.setItemAsync(SECURE_STORE_KEYS.APP_TOKEN, appToken),
		SecureStore.setItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN, refreshToken),
		SecureStore.setItemAsync(SECURE_STORE_KEYS.TOKEN_EXPIRES_AT, String(expiresAt)),
	]);
}

/**
 * Remove all stored auth tokens from secure storage.
 * Exported so `authService.ts` can call it on sign-out.
 */
export async function clearTokens(): Promise<void> {
	inMemoryAppToken = null;
	await Promise.all([
		SecureStore.deleteItemAsync(SECURE_STORE_KEYS.APP_TOKEN),
		SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN),
		SecureStore.deleteItemAsync(SECURE_STORE_KEYS.TOKEN_EXPIRES_AT),
	]);
}

/**
 * Attempt to silently refresh the token pair using the stored refresh token.
 * Returns the new app token on success, or throws on failure.
 */
async function silentRefresh(): Promise<string> {
	const storedRefreshToken = await SecureStore.getItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
	if (!storedRefreshToken) {
		throw new Error('No refresh token available');
	}

	// Use a plain axios call (not axiosClient) to avoid interceptor loops
	const { data: resp } = await axios.post<ApiResponse<RefreshTokenResponse>>(
		`${Config.API_URL}/api/auth/refresh`,
		{ refresh_token: storedRefreshToken },
		{ headers: { 'Content-Type': 'application/json' }, timeout: 10_000 },
	);

	if (!resp.is_success || !resp.data?.app_token) {
		throw new Error('Refresh failed');
	}

	const { app_token, refresh_token, expires_in } = resp.data;
	await persistTokens(app_token, refresh_token, expires_in);
	return app_token;
}

// Augment AxiosRequestConfig to carry a _retry flag
interface RetryableRequest extends InternalAxiosRequestConfig {
	_retry?: boolean;
}

axiosClient.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config as RetryableRequest;

		// ── 401 Unauthorized ─────────────────────────────────────────────────
		if (
			axios.isAxiosError(error) &&
			error.response?.status === 401 &&
			!originalRequest._retry
		) {
			// Mark so we never retry more than once per request
			originalRequest._retry = true;

			if (isRefreshing) {
				// Another refresh is already in-flight — queue this request
				return new Promise<string>((resolve, reject) => {
					pendingQueue.push({ resolve, reject });
				})
					.then((newToken) => {
						originalRequest.headers.Authorization = `Bearer ${newToken}`;
						return axiosClient(originalRequest);
					})
					.catch(() => Promise.reject(error));
			}

			isRefreshing = true;

			try {
				const newToken = await silentRefresh();
				isRefreshing = false;
				drainQueue(newToken);

				// Retry the original request with the new token
				originalRequest.headers.Authorization = `Bearer ${newToken}`;
				return axiosClient(originalRequest);
			} catch (refreshError) {
				isRefreshing = false;
				drainQueue(null, refreshError);

				// Refresh failed — clear all tokens and signal logout
				await clearTokens();
				// Emit a custom event that authStore listens to
				authLogoutEmitter.emit();
				return Promise.reject(error);
			}
		}

		// ── Normalize backend error responses into ApiError ──────────────────
		if (axios.isAxiosError(error) && error.response?.data) {
			const data = error.response.data as ApiResponse<unknown>;
			if (data.error) {
				throw new ApiError(
					data.error.message,
					data.error.code,
					error.response.status,
					data.error.fields,
				);
			}
		}

		// Re-throw unhandled errors as-is
		throw error;
	},
);

// ---------------------------------------------------------------------------
// Auth logout event emitter (minimal pub/sub to decouple from Zustand)
// ---------------------------------------------------------------------------

type LogoutListener = () => void;

export const authLogoutEmitter = {
	_listeners: new Set<LogoutListener>(),
	emit(): void {
		for (const fn of this._listeners) fn();
	},
	on(fn: LogoutListener): () => void {
		this._listeners.add(fn);
		return () => this._listeners.delete(fn);
	},
};

export default axiosClient;
