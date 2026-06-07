/**
 * User API service — CRUD operations for the `/api/users` endpoints.
 *
 * All endpoints require Bearer token authentication (auto-attached by axiosClient).
 * Maps backend snake_case responses to camelCase domain types.
 */

import axiosClient from '@services/api/axiosClient';
import type {
	ApiResponse,
	BackendUserResponse,
	ListUsersParams,
	PaginatedResponse,
	UpdateUserRequest,
} from '@t/api.types';
import { mapBackendUser } from '@t/api.types';
import type { User } from '@t/user.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaginatedUsers {
	items: User[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/**
 * List users with pagination, filtering, and sorting.
 *
 * Backend supports query params:
 * - `page`, `limit` — pagination
 * - `sort` — e.g. `created_at:desc`
 * - `search` — full-text search across allowed fields
 * - `role`, `status` — filter by exact match
 *
 * @example
 * const result = await userService.getUsers({ page: 1, limit: 20, sort: 'created_at:desc' });
 */
async function getUsers(params?: ListUsersParams): Promise<PaginatedUsers> {
	const { data: resp } = await axiosClient.get<
		ApiResponse<PaginatedResponse<BackendUserResponse>>
	>('/api/users', { params });

	if (!resp.is_success) {
		throw new Error(resp.error?.message ?? 'Failed to fetch users');
	}

	return {
		items: resp.data.items.map(mapBackendUser),
		total: resp.data.total,
		page: resp.data.page,
		limit: resp.data.limit,
		totalPages: resp.data.total_pages,
	};
}

/**
 * Get a single user by ID.
 *
 * @throws {ApiError} with code `USER_NOT_FOUND` if the user doesn't exist.
 */
async function getUserById(id: number): Promise<User> {
	const { data: resp } = await axiosClient.get<ApiResponse<BackendUserResponse>>(
		`/api/users/${id}`,
	);

	if (!resp.is_success) {
		throw new Error(resp.error?.message ?? 'Failed to fetch user');
	}

	return mapBackendUser(resp.data);
}

/**
 * Update a user's role and/or status (admin operation).
 *
 * @param id   — The user ID to update.
 * @param data — Fields to update (role, status). Only non-empty fields are applied.
 *
 * @throws {ApiError} with code `VALIDATION_ERROR` if role/status are invalid.
 * @throws {ApiError} with code `USER_NOT_FOUND` if the user doesn't exist.
 */
async function updateUser(id: number, data: UpdateUserRequest): Promise<User> {
	const { data: resp } = await axiosClient.put<ApiResponse<BackendUserResponse>>(
		`/api/users/${id}`,
		data,
	);

	if (!resp.is_success) {
		throw new Error(resp.error?.message ?? 'Failed to update user');
	}

	return mapBackendUser(resp.data);
}

/**
 * Soft-delete a user.
 *
 * Backend performs a soft delete (sets `deleted_at`).
 * Returns void — the response is 204 No Content on success.
 *
 * @throws {ApiError} with code `USER_NOT_FOUND` if the user doesn't exist.
 */
async function deleteUser(id: number): Promise<void> {
	await axiosClient.delete(`/api/users/${id}`);
}

export const userService = {
	getUsers,
	getUserById,
	updateUser,
	deleteUser,
};
