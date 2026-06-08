import { create } from 'zustand';
import { useEffect } from 'react';
import type { User } from '@t/user.types';
import { authService } from '@features/auth/services/authService';
import { authLogoutEmitter } from '@services/api/axiosClient';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnboardingComplete: boolean;
}

interface AuthActions {
  init: () => Promise<void>;
  setSignedIn: (user: User, isFirstLogin: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  clearAuth: () => void;
  completeOnboarding: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isOnboardingComplete: false,

  init: async () => {
    try {
      const user = await authService.getMe();
      if (!user) {
        set({ isLoading: false });
        return;
      }
      const onboardingComplete = await authService.isOnboardingComplete();
      set({ user, isAuthenticated: true, isOnboardingComplete: onboardingComplete, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setSignedIn: async (user: User, isFirstLogin: boolean) => {
    const onboardingComplete = isFirstLogin
      ? false
      : await authService.isOnboardingComplete();
    set({ user, isAuthenticated: true, isOnboardingComplete: onboardingComplete });
  },

  /**
   * Explicit sign-out: calls Google sign-out, clears all stored tokens,
   * then resets local auth state.
   */
  signOut: async () => {
    await authService.signOut();
    get().clearAuth();
  },

  clearAuth: () => {
    set({ user: null, isAuthenticated: false, isOnboardingComplete: false });
  },

  completeOnboarding: async () => {
    await authService.markOnboardingComplete();
    set({ isOnboardingComplete: true });
  },
}));

export function useAuthLogoutListener(): void {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    const unsubscribe = authLogoutEmitter.on(() => {
      clearAuth();
    });
    return unsubscribe;
  }, [clearAuth]);
}
