import { api } from "@/lib/apiClient";
import { isOnboardedFromCache } from "@/services/profileService";
import type { FriendsActivityData } from "@/app/(tabs)/home";

// =======================================================
// Fallback an toàn khi API social fail.
// KHÔNG dùng mock data — trả về 0/false để UI hiển thị empty state.
// Tránh hiển thị dữ liệu giả khi user chưa có bạn bè hoạt động.
// =======================================================
const DEFAULT_FRIENDS: FriendsActivityData = {
  activeCount: 0,
  latestActivity: "No friend activity yet",
};

// =======================================================
// Lấy dữ liệu hoạt động bạn bè
//
// Dùng cho HomeScreen:
// - hiển thị số bạn đang active
// - hiển thị hoạt động gần nhất
// Nếu API fail hoặc không có bạn bè → trả về 0 và empty state.
// Tránh hiển thị mock data khi user chưa có dữ liệu thật.
// =======================================================
export async function getFriendsActivity(): Promise<FriendsActivityData> {
  // Fallback an toàn — không dùng mock data, chỉ hiển thị empty state
  let friendsData = DEFAULT_FRIENDS;

  try {
    // =======================================================
    // Gọi API social feed
    // =======================================================
    const feedRaw = await api.get<
      | {
          items?: {
            display_name?: string;
            completed_all_goals_today?: boolean;
          }[];
        }
      | {
          friends?: {
            display_name?: string;
            current_streak?: number;
          }[];
        }
    >("/social/feed");

    // Lấy danh sách items từ feed
    const items = (feedRaw as any)?.items;

    // Nếu có dữ liệu và là array
    if (Array.isArray(items) && items.length > 0) {
      // Đếm số bạn đã complete goal hôm nay
      const activeCount = items.filter(
        (item: any) => item.completed_all_goals_today === true,
      ).length;

      // Lấy user đầu tiên làm latest activity
      const latest = items[0];

      // Nếu có tên thì tạo message động, không thì trả về empty state
      const latestActivity = latest.display_name
        ? `${latest.display_name} is active today`
        : "No friend activity yet";

      // Gán data mới để trả về
      friendsData = {
        activeCount,
        latestActivity,
      };
    }
  } catch (err: any) {
    // Nếu API fail thì log warning, vẫn dùng fallback data
    if (err?.status === 403 && isOnboardedFromCache()) {
      console.warn(
        "[SocialService] 403 ignored — cached profile says onboarding_done=true (transient backend)",
      );
    } else {
      console.warn("[SocialService] Friends activity fetch failed:", err);
    }
  }

  // Trả data cuối cùng
  // hoặc từ API hoặc fallback
  return friendsData;
}
