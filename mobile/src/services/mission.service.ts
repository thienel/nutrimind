import { api } from "@/lib/apiClient";
import type { MissionItem } from "@/app/(tabs)/home";

const DEFAULT_MISSIONS: MissionItem[] = [
  { text: "Drink 8 glasses of water", done: true },
  { text: "Eat 40g protein", done: false },
  { text: "Complete 3 meals", done: false },
  { text: "Keep under 1800 kcal", done: true },
];

export async function getTodayMissions(): Promise<MissionItem[]> {
  let missionsData: MissionItem[] = DEFAULT_MISSIONS;

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
      const completedCount = items.filter(
        (item: any) => item.completed_all_goals_today === true,
      ).length;
      const totalCount = items.length;
      const allDone = completedCount === totalCount && totalCount > 0;
      const someDone = completedCount > 0;

      missionsData = [
        { text: "Drink 8 glasses of water", done: true },
        { text: "Eat 40g protein", done: someDone },
        { text: "Complete 3 meals", done: someDone },
        { text: "Keep under 1800 kcal", done: allDone },
      ];
    }
  } catch (err: any) {
    console.warn(
      "[MissionService] Feed fetch failed, using default missions:",
      err,
    );
  }

  return missionsData;
}
