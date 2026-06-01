import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@features/auth/hooks/useAuth';
import { isErrorWithCode, statusCodes } from '@features/auth/services/authService';

export default function SignInScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn();
    } catch (error: unknown) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
        if (error.code === statusCodes.IN_PROGRESS) return;
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          Alert.alert('Error', 'Google Play Services is not available on this device.');
          return;
        }
      }
      const message = error instanceof Error ? error.message : 'Sign in failed. Please try again.';
      Alert.alert('Sign In Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Image
          source={require('../../../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>NutriMind</Text>
        <Text style={styles.tagline}>Your AI-powered nutrition coach</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.googleButton, isLoading && styles.googleButtonDisabled]}
          onPress={handleSignIn}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.disclaimer}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  footer: {
    paddingBottom: 16,
    gap: 12,
  },
  googleButton: {
    backgroundColor: '#4285F4',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
});
