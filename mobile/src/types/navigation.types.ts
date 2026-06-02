import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  SignIn: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  WaterTracking: undefined;
};

export type MealStackParamList = {
  MealLog: undefined;
  ManualFoodEntry: undefined;
  PhotoAnalysis: undefined;
};

export type AICoachStackParamList = {
  AICoach: undefined;
};

export type ProgressStackParamList = {
  Progress: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  Reminders: undefined;
};

export type MainTabParamList = {
  HomeStack: NavigatorScreenParams<HomeStackParamList>;
  MealStack: NavigatorScreenParams<MealStackParamList>;
  AICoachStack: NavigatorScreenParams<AICoachStackParamList>;
  ProgressStack: NavigatorScreenParams<ProgressStackParamList>;
  ProfileStack: NavigatorScreenParams<ProfileStackParamList>;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};

export type SignInScreenProps = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;
export type OnboardingScreenProps = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;
export type MainTabsScreenProps = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;
