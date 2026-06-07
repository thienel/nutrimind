import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Config } from '@shared/constants/config';

export const SECURE_STORE_KEYS = {
	APP_TOKEN: 'nutrimind_app_token',
	ONBOARDING_COMPLETE: 'nutrimind_onboarding_complete',
} as const;

/**
 * @deprecated Import `ApiResponse` from `@t/api.types` instead.
 * Kept for backward compatibility with existing code.
 */
export type ApiResponse<T> = {
	is_success: boolean;
	data: T;
	message: string;
	error?: {
		code: string;
		message: string;
		fields?: { field: string; message: string }[];
	};
};

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
	const token = await SecureStore.getItemAsync(SECURE_STORE_KEYS.APP_TOKEN);
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

// ---------------------------------------------------------------------------
// Response interceptor — handle 401 & normalize errors
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

axiosClient.interceptors.response.use(
	(response) => response,
	async (error) => {
		// Handle 401 Unauthorized globally — clear stored token
		if (axios.isAxiosError(error) && error.response?.status === 401) {
			await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.APP_TOKEN);
			// Note: Navigation redirect is handled by authStore listener
			// (useAuthStore.init() will see no token and set isAuthenticated=false)
		}

		// Normalize backend error responses into ApiError
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

export default axiosClient;
