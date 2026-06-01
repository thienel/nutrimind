import { useCallback } from 'react';
import { useAuthStore } from '@features/auth/store/authStore';
import { authService } from '@features/auth/services/authService';

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    isOnboardingComplete,
    setSignedIn,
    clearAuth,
    completeOnboarding,
  } = useAuthStore();

  const signIn = useCallback(async () => {
    const result = await authService.signIn();
    await setSignedIn(result.user, result.isFirstLogin);
    return result;
  }, [setSignedIn]);

  const signOut = useCallback(async () => {
    await authService.signOut();
    clearAuth();
  }, [clearAuth]);

  return {
    user,
    isAuthenticated,
    isLoading,
    isOnboardingComplete,
    signIn,
    signOut,
    completeOnboarding,
  };
}
