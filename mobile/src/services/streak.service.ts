import { api } from "@/lib/apiClient";
import type { StreakData } from "@/app/(tabs)/home";

const DEFAULT_STREAK: StreakData = {
  current: 6,
  weeklyProgress: [true, true, true, true, true, true, false],
};

export async function getStreak(): Promise<StreakData> {
  let streakData = DEFAULT_STREAK;

  try {
    const friendsRaw = await api.get<{
      friends?: Array<{ current_streak?: number }>;
    }>("/social/friends");
    const friends = friendsRaw?.friends;

    if (Array.isArray(friends) && friends.length > 0) {
      const streaks = friends
        .map((f) => f.current_streak)
        .filter((s): s is number => typeof s === "number" && s > 0);

      if (streaks.length > 0) {
        const maxStreak = Math.max(...streaks);
        streakData = {
          current: maxStreak,
          weeklyProgress: DEFAULT_STREAK.weeklyProgress,
        };
      }
    }
  } catch (err: any) {
    console.warn("[StreakService] Failed to load streak:", err);
  }

  return streakData;
}
