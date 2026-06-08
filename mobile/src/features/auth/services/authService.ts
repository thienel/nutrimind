import {
	GoogleSignin,
	isSuccessResponse,
	isErrorWithCode,
	statusCodes,
} from '@react-native-google-signin/google-signin';
import * as SecureStore from 'expo-secure-store';
import { Config } from '@shared/constants/config';
import axiosClient, {
	SECURE_STORE_KEYS,
	persistTokens,
	clearTokens,
} from '@services/api/axiosClient';
import type { User } from '@t/user.types';
import type { ApiResponse, BackendSignInResponse, BackendUserResponse } from '@t/api.types';
import { mapBackendUser } from '@t/api.types';

export interface SignInResult {
	user: User;
	appToken: string;
	expiresIn: number;
	refreshToken: string;
	refreshExpiresIn: number;
	isFirstLogin: boolean;
}

GoogleSignin.configure({
	webClientId: Config.GOOGLE_WEB_CLIENT_ID,
	iosClientId: Config.GOOGLE_IOS_CLIENT_ID || undefined,
	offlineAccess: false,
	scopes: ['profile', 'email'],
});

export const authService = {
	async signIn(): Promise<SignInResult> {
		await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
		const googleResponse = await GoogleSignin.signIn();

		if (!isSuccessResponse(googleResponse)) {
			throw new Error('Google sign-in was cancelled');
		}

		if (!googleResponse.data.idToken) {
			throw new Error('No ID token received from Google');
		}

		const { data: resp } = await axiosClient.post<ApiResponse<BackendSignInResponse>>(
			'/api/auth/google',
			{ id_token: googleResponse.data.idToken },
		);

		if (!resp.is_success) {
			throw new Error(resp.error?.message ?? 'Authentication failed');
		}

		const {
			user: rawUser,
			app_token,
			expires_in,
			refresh_token,
			refresh_expires_in,
			is_first_login,
		} = resp.data;

		// Persist both tokens to device secure storage (Keychain / Keystore)
		await persistTokens(app_token, refresh_token, expires_in);

		return {
			user: mapBackendUser(rawUser),
			appToken: app_token,
			expiresIn: expires_in,
			refreshToken: refresh_token,
			refreshExpiresIn: refresh_expires_in,
			isFirstLogin: is_first_login,
		};
	},

	/**
	 * Sign out: revoke Google session (best-effort) and clear all local tokens.
	 */
	async signOut(): Promise<void> {
		try {
			await GoogleSignin.signOut();
		} catch {
			// Google sign-out is best-effort; always clear local state
		}
		await clearTokens();
		await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.ONBOARDING_COMPLETE);
	},

	/**
	 * Fetch the current user's profile from the backend.
	 * Returns null if no token is stored or the request fails.
	 * The axiosClient will attempt a silent refresh on 401 before this returns null.
	 */
	async getMe(): Promise<User | null> {
		try {
			const { data: resp } = await axiosClient.get<ApiResponse<BackendUserResponse>>(
				'/api/auth/me',
			);
			if (!resp.is_success) return null;
			return mapBackendUser(resp.data);
		} catch {
			return null;
		}
	},

	async isOnboardingComplete(): Promise<boolean> {
		const val = await SecureStore.getItemAsync(SECURE_STORE_KEYS.ONBOARDING_COMPLETE);
		return val === 'true';
	},

	async markOnboardingComplete(): Promise<void> {
		await SecureStore.setItemAsync(SECURE_STORE_KEYS.ONBOARDING_COMPLETE, 'true');
	},
};

export { isErrorWithCode, statusCodes };
