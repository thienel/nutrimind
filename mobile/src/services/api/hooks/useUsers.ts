/**
 * React Query hooks for user management API.
 *
 * Provides `useUsers`, `useUser`, `useUpdateUser`, and `useDeleteUser`
 * with automatic caching and cache invalidation.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userService, type PaginatedUsers } from '@services/api/userService';
import type { ListUsersParams, UpdateUserRequest } from '@t/api.types';
import type { User } from '@t/user.types';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const userKeys = {
	all: ['users'] as const,
	lists: () => [...userKeys.all, 'list'] as const,
	list: (params?: ListUsersParams) => [...userKeys.lists(), params] as const,
	details: () => [...userKeys.all, 'detail'] as const,
	detail: (id: number) => [...userKeys.details(), id] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch a paginated list of users.
 *
 * @example
 * const { data, isLoading } = useUsers({ page: 1, limit: 20 });
 */
export function useUsers(params?: ListUsersParams) {
	return useQuery<PaginatedUsers>({
		queryKey: userKeys.list(params),
		queryFn: () => userService.getUsers(params),
	});
}

/**
 * Fetch a single user by ID.
 *
 * @example
 * const { data: user } = useUser(42);
 */
export function useUser(id: number) {
	return useQuery<User>({
		queryKey: userKeys.detail(id),
		queryFn: () => userService.getUserById(id),
		enabled: id > 0,
	});
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Update a user's role and/or status.
 * Automatically invalidates user list and detail caches on success.
 *
 * @example
 * const mutation = useUpdateUser();
 * mutation.mutate({ id: 42, data: { role: 'ADMIN' } });
 */
export function useUpdateUser() {
	const queryClient = useQueryClient();

	return useMutation<User, Error, { id: number; data: UpdateUserRequest }>({
		mutationFn: ({ id, data }) => userService.updateUser(id, data),
		onSuccess: (_updatedUser, { id }) => {
			// Invalidate both the specific user and the list
			queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
			queryClient.invalidateQueries({ queryKey: userKeys.lists() });
		},
	});
}

/**
 * Delete a user (soft-delete).
 * Automatically invalidates user list cache on success.
 *
 * @example
 * const mutation = useDeleteUser();
 * mutation.mutate(42);
 */
export function useDeleteUser() {
	const queryClient = useQueryClient();

	return useMutation<void, Error, number>({
		mutationFn: (id) => userService.deleteUser(id),
		onSuccess: (_data, id) => {
			// Remove from detail cache and refresh list
			queryClient.removeQueries({ queryKey: userKeys.detail(id) });
			queryClient.invalidateQueries({ queryKey: userKeys.lists() });
		},
	});
}
