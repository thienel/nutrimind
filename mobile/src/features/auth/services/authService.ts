import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as SecureStore from 'expo-secure-store';
import { Config } from '@shared/constants/config';
import axiosClient, { SECURE_STORE_KEYS, type ApiResponse } from '@services/api/axiosClient';
import type { User, UserRole, UserStatus } from '@t/user.types';

export interface SignInResult {
  user: User;
  appToken: string;
  expiresIn: number;
  isFirstLogin: boolean;
}

interface BackendUser {
  id: number;
  google_id: string;
  email: string;
  display_name: string;
  photo_url?: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface BackendSignInData {
  user: BackendUser;
  app_token: string;
  expires_in: number;
  is_first_login: boolean;
}

GoogleSignin.configure({
  webClientId: Config.GOOGLE_WEB_CLIENT_ID,
  iosClientId: Config.GOOGLE_IOS_CLIENT_ID || undefined,
  offlineAccess: false,
  scopes: ['profile', 'email'],
});

function mapBackendUser(raw: BackendUser): User {
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

    const { data: resp } = await axiosClient.post<ApiResponse<BackendSignInData>>(
      '/api/auth/google',
      { id_token: googleResponse.data.idToken },
    );

    if (!resp.is_success) {
      throw new Error(resp.error?.message ?? 'Authentication failed');
    }

    const { user: rawUser, app_token, expires_in, is_first_login } = resp.data;
    await SecureStore.setItemAsync(SECURE_STORE_KEYS.APP_TOKEN, app_token);

    return {
      user: mapBackendUser(rawUser),
      appToken: app_token,
      expiresIn: expires_in,
      isFirstLogin: is_first_login,
    };
  },

  async signOut(): Promise<void> {
    try {
      await GoogleSignin.signOut();
    } catch {
      // Google sign-out is best-effort; always clear local state
    }
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.APP_TOKEN);
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.ONBOARDING_COMPLETE);
  },

  async getMe(): Promise<User | null> {
    try {
      const { data: resp } = await axiosClient.get<ApiResponse<BackendUser>>('/api/auth/me');
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
