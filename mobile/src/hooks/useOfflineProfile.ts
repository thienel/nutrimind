/**
 * useOfflineProfile — cache profile vào AsyncStorage khi online,
 * đọc cache khi offline.
 *
 * §3.3: View Profile offline với fallback và banner "Có thể chưa cập nhật"
 */

import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/lib/apiClient";
import { useNetwork } from "@/context/NetworkContext";

const CACHE_KEY = "nutrimind_profile_cache";
const CACHE_TS_KEY = "nutrimind_profile_cache_ts";

export interface CachedProfile {
  fullName: string;
  email: string;
  age: string;
  gender: string;
  height: string;
  weight: string;
  goal: string;
  photoUrl?: string;
  waterTargetMl?: number;
}

interface UseOfflineProfileReturn {
  profile: CachedProfile | null;
  isLoading: boolean;
  isStale: boolean; // true khi đang offline và đang dùng cache
  lastUpdated: Date | null;
  refresh(): Promise<void>;
}

const DEFAULT_PROFILE: CachedProfile = {
  fullName: "",
  email: "",
  age: "",
  gender: "",
  height: "",
  weight: "",
  goal: "",
};

async function loadFromCache(): Promise<{
  profile: CachedProfile | null;
  ts: Date | null;
}> {
  try {
    const [raw, tsRaw] = await Promise.all([
      AsyncStorage.getItem(CACHE_KEY),
      AsyncStorage.getItem(CACHE_TS_KEY),
    ]);
    if (!raw) return { profile: null, ts: null };
    const profile = JSON.parse(raw) as CachedProfile;
    const ts = tsRaw ? new Date(tsRaw) : null;
    return { profile, ts };
  } catch {
    return { profile: null, ts: null };
  }
}

async function saveToCache(profile: CachedProfile): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(profile)),
    AsyncStorage.setItem(CACHE_TS_KEY, new Date().toISOString()),
  ]);
}

/**
 * Xóa cache profile — gọi khi sign-out
 */
export async function clearProfileCache(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(CACHE_KEY),
    AsyncStorage.removeItem(CACHE_TS_KEY),
  ]);
}

export function useOfflineProfile(): UseOfflineProfileReturn {
  const { isOnline } = useNetwork();
  const [profile, setProfile] = useState<CachedProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchFromServer = useCallback(async (): Promise<void> => {
    try {
      // Gọi API lấy profile
      const serverProfile = await api.get<{
        display_name?: string;
        email?: string;
        age?: number;
        gender?: string;
        height_cm?: number;
        weight_kg?: number;
        goal?: string;
        avatar_url?: string;
        water_target_ml?: number;
      }>("/profile");

      const mapped: CachedProfile = {
        fullName: serverProfile.display_name ?? "",
        email: serverProfile.email ?? "",
        age: serverProfile.age?.toString() ?? "",
        gender: serverProfile.gender ?? "",
        height: serverProfile.height_cm?.toString() ?? "",
        weight: serverProfile.weight_kg?.toString() ?? "",
        goal: serverProfile.goal ?? "",
        photoUrl: serverProfile.avatar_url,
        waterTargetMl: serverProfile.water_target_ml,
      };

      await saveToCache(mapped);
      setProfile(mapped);
      setIsStale(false);
      setLastUpdated(new Date());
    } catch {
      // Network error — không làm gì, để cache cũ
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isOnline) {
        await fetchFromServer();
      } else {
        const { profile: cached, ts } = await loadFromCache();
        setProfile(cached ?? DEFAULT_PROFILE);
        setIsStale(true);
        setLastUpdated(ts);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, fetchFromServer]);

  // Load khi mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setIsLoading(true);
      try {
        // Luôn load cache trước (fast render)
        const { profile: cached, ts } = await loadFromCache();
        if (!cancelled && cached) {
          setProfile(cached);
          setLastUpdated(ts);
        }

        // Nếu online, refresh từ server (background)
        if (isOnline) {
          await fetchFromServer();
        } else {
          if (!cancelled) setIsStale(true);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [isOnline, fetchFromServer]);

  return { profile, isLoading, isStale, lastUpdated, refresh };
}
