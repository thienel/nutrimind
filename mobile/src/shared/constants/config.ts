export const Config = {
  API_URL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000',
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ?? '',
  GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ?? '',
  GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '',
  GEMINI_MODEL: process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-2.0-flash',
  APP_ENV: (process.env.EXPO_PUBLIC_APP_ENV ?? 'development') as 'development' | 'production',
} as const;
