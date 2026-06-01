import { create } from 'zustand';
import type { User } from '@t/user.types';
import { authService } from '@features/auth/services/authService';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnboardingComplete: boolean;
}

interface AuthActions {
  init: () => Promise<void>;
  setSignedIn: (user: User, isFirstLogin: boolean) => Promise<void>;
  clearAuth: () => void;
  completeOnboarding: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
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

  clearAuth: () => {
    set({ user: null, isAuthenticated: false, isOnboardingComplete: false });
  },

  completeOnboarding: async () => {
    await authService.markOnboardingComplete();
    set({ isOnboardingComplete: true });
  },
}));
