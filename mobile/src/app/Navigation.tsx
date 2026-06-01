import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@features/auth/store/authStore';
import SignInScreen from '@features/auth/screens/SignInScreen';
import OnboardingScreen from '@features/onboarding/screens/OnboardingScreen';
import type { RootStackParamList } from '@t/navigation.types';

// Placeholder until main tabs are built
import { Text } from 'react-native';
const MainTabsPlaceholder = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>Main App</Text>
  </View>
);

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Navigation() {
  const { isAuthenticated, isLoading, isOnboardingComplete, init } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="SignIn" component={SignInScreen} />
        ) : !isOnboardingComplete ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <Stack.Screen name="MainTabs" component={MainTabsPlaceholder} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 18,
    color: '#6b7280',
  },
});
