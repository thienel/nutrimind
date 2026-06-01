import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Config } from '@shared/constants/config';

export const SECURE_STORE_KEYS = {
  APP_TOKEN: 'nutrimind_app_token',
  ONBOARDING_COMPLETE: 'nutrimind_onboarding_complete',
} as const;

export type ApiResponse<T> = {
  is_success: boolean;
  data: T;
  message: string;
  error?: {
    code: string;
    message: string;
    fields?: { field: string; message: string }[];
  };
};

const axiosClient = axios.create({
  baseURL: Config.API_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

axiosClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(SECURE_STORE_KEYS.APP_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosClient;
