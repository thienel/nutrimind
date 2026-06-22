import { api } from "@/lib/apiClient";
import type { FriendsActivityData } from "@/app/(tabs)/home";

const DEFAULT_FRIENDS: FriendsActivityData = {
  activeCount: 4,
  latestActivity: "Linh completed hydration • Minh hit protein target",
};

export async function getFriendsActivity(): Promise<FriendsActivityData> {
  let friendsData = DEFAULT_FRIENDS;

  try {
    const feedRaw = await api.get<
      | {
          items?: Array<{
            display_name?: string;
            completed_all_goals_today?: boolean;
          }>;
        }
      | {
          friends?: Array<{
            display_name?: string;
            current_streak?: number;
          }>;
        }
    >("/social/feed");
    const items = (feedRaw as any)?.items;
    if (Array.isArray(items) && items.length > 0) {
      const activeCount = items.filter(
        (item: any) => item.completed_all_goals_today === true,
      ).length;
      const latest = items[0];
      const latestActivity = latest.display_name
        ? `${latest.display_name} is active today`
        : DEFAULT_FRIENDS.latestActivity;
      friendsData = { activeCount, latestActivity };
    }
  } catch (err: any) {
    console.warn("[SocialService] Friends activity fetch failed:", err);
  }

  return friendsData;
}
