import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@features/auth/store/authStore';
import SignInScreen from '@features/auth/screens/SignInScreen';
import OnboardingScreen from '@features/onboarding/screens/OnboardingScreen';
import HomeScreen from '@features/dashboard/screens/HomeScreen';
import MealLogScreen from '@features/meal-logging/screens/MealLogScreen';
import ManualFoodEntryScreen from '@features/meal-logging/screens/ManualFoodEntryScreen';
import PhotoAnalysisScreen from '@features/meal-logging/screens/PhotoAnalysisScreen';
import AICoachScreen from '@features/ai-coach/screens/AICoachScreen';
import ProgressScreen from '@features/progress/screens/ProgressScreen';
import WaterTrackingScreen from '@features/water-tracking/screens/WaterTrackingScreen';
import ProfileScreen from '@features/profile/screens/ProfileScreen';
import RemindersScreen from '@features/notifications/screens/RemindersScreen';
import type {
  RootStackParamList,
  AuthStackParamList,
  MainTabParamList,
  HomeStackParamList,
  MealStackParamList,
  AICoachStackParamList,
  ProgressStackParamList,
  ProfileStackParamList,
} from '@t/navigation.types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const MealStack = createNativeStackNavigator<MealStackParamList>();
const AICoachStack = createNativeStackNavigator<AICoachStackParamList>();
const ProgressStack = createNativeStackNavigator<ProgressStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function AuthStackNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
    </AuthStack.Navigator>
  );
}

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="WaterTracking" component={WaterTrackingScreen} />
    </HomeStack.Navigator>
  );
}

function MealStackNavigator() {
  return (
    <MealStack.Navigator screenOptions={{ headerShown: false }}>
      <MealStack.Screen name="MealLog" component={MealLogScreen} />
      <MealStack.Screen name="ManualFoodEntry" component={ManualFoodEntryScreen} />
      <MealStack.Screen name="PhotoAnalysis" component={PhotoAnalysisScreen} />
    </MealStack.Navigator>
  );
}

function AICoachStackNavigator() {
  return (
    <AICoachStack.Navigator screenOptions={{ headerShown: false }}>
      <AICoachStack.Screen name="AICoach" component={AICoachScreen} />
    </AICoachStack.Navigator>
  );
}

function ProgressStackNavigator() {
  return (
    <ProgressStack.Navigator screenOptions={{ headerShown: false }}>
      <ProgressStack.Screen name="Progress" component={ProgressScreen} />
    </ProgressStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      <ProfileStack.Screen name="Reminders" component={RemindersScreen} />
    </ProfileStack.Navigator>
  );
}

function MainTabsNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="HomeStack" component={HomeStackNavigator} options={{ title: 'Home' }} />
      <Tab.Screen name="MealStack" component={MealStackNavigator} options={{ title: 'Meals' }} />
      <Tab.Screen name="AICoachStack" component={AICoachStackNavigator} options={{ title: 'Coach' }} />
      <Tab.Screen name="ProgressStack" component={ProgressStackNavigator} options={{ title: 'Progress' }} />
      <Tab.Screen name="ProfileStack" component={ProfileStackNavigator} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const { isAuthenticated, isLoading, isOnboardingComplete, init } = useAuthStore();
  const bypassAuth = true;

  useEffect(() => {
    init();
  }, [init]);

  if (isLoading && !bypassAuth) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated && !bypassAuth ? (
          <RootStack.Screen name="Auth" component={AuthStackNavigator} />
        ) : !isOnboardingComplete && !bypassAuth ? (
          <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <RootStack.Screen name="MainTabs" component={MainTabsNavigator} />
        )}
      </RootStack.Navigator>
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
});
