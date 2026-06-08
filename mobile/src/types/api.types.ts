/**
 * Centralized API types matching backend DTOs.
 *
 * All types use **snake_case** field names to match the JSON contract
 * from the Go backend. Mappers convert these to camelCase domain types.
 *
 * Backend response format: pkg/response/response.go
 * Backend error format:    pkg/error/error.go
 */

import type { UserRole, UserStatus } from '@t/user.types';

// ---------------------------------------------------------------------------
// Generic response wrappers
// ---------------------------------------------------------------------------

/**
 * Standard API response envelope.
 * Matches backend `response.APIResponse[T]`.
 *
 * NOTE: Also exported from axiosClient.ts as `ApiResponse<T>` — prefer this
 * canonical location for new code.
 */
export interface ApiResponse<T> {
	is_success: boolean;
	data: T;
	message: string;
	error?: ApiErrorDetail;
}

/**
 * Paginated list response.
 * Matches backend `dto.ListResponse[T]`.
 */
export interface PaginatedResponse<T> {
	items: T[];
	total: number;
	page: number;
	limit: number;
	total_pages: number;
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

/** Structured API error from backend `apperror.AppError`. */
export interface ApiErrorDetail {
	code: string;
	message: string;
	fields?: FieldError[];
}

export interface FieldError {
	field: string;
	message: string;
}

// ---------------------------------------------------------------------------
// User DTOs (matches backend dto/user_dtos.go)
// ---------------------------------------------------------------------------

/**
 * Raw user object from backend JSON (snake_case).
 * Matches `dto.UserResponse` in Go.
 */
export interface BackendUserResponse {
	id: number;
	google_id: string;
	email: string;
	display_name: string;
	photo_url?: string;
	role: string;
	status: string;
	created_at: string;
	updated_at: string;
	deleted_at?: string;
}

/**
 * Google Sign-In response payload.
 * Matches `dto.GoogleSignInResponse`.
 */
export interface BackendSignInResponse {
	user: BackendUserResponse;
	app_token: string;
	expires_in: number;          // app token lifetime in seconds
	refresh_token: string;
	refresh_expires_in: number;  // refresh token lifetime in seconds
	is_first_login: boolean;
}

/**
 * Response from POST /api/auth/refresh.
 * Matches `dto.RefreshTokenResponse`.
 */
export interface RefreshTokenResponse {
	app_token: string;
	expires_in: number;          // app token lifetime in seconds
	refresh_token: string;
	refresh_expires_in: number;  // refresh token lifetime in seconds
}

/**
 * Update user request body (admin).
 * Matches `dto.UpdateUserRequest`.
 */
export interface UpdateUserRequest {
	role?: string;
	status?: string;
}

// ---------------------------------------------------------------------------
// Query params for list endpoints
// ---------------------------------------------------------------------------

/** Query parameters for `GET /api/users`. */
export interface ListUsersParams {
	page?: number;
	limit?: number;
	sort?: string; // e.g. "created_at:desc"
	search?: string;
	role?: string;
	status?: string;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

import type { User } from '@t/user.types';

/**
 * Map a backend snake_case user response to the app's camelCase `User` type.
 */
export function mapBackendUser(raw: BackendUserResponse): User {
	return {
		id: raw.id,
		googleId: raw.google_id,
		email: raw.email,
		displayName: raw.display_name,
		photoUrl: raw.photo_url,
		role: raw.role as UserRole,
		status: raw.status as UserStatus,
		createdAt: raw.created_at,
		updatedAt: raw.updated_at,
	};
}
