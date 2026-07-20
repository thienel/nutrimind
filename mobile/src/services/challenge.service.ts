import { api } from "@/lib/apiClient";
import { isOnboardedFromCache } from "@/services/profileService";
import type {
  GetChallengeCatalogueResponse,
  CatalogueChallengeItemResponse,
} from "@/app/(tabs)/home";

/**
 * Lấy danh sách challenge có sẵn (catalogue).
 * Backend: GET /social/challenges
 * Trả về danh sách challenge kèm my_enrollment nếu user đã join.
 */
export async function getChallengeCatalogue(): Promise<
  CatalogueChallengeItemResponse[]
> {
  try {
    const raw = await api.get<
      GetChallengeCatalogueResponse | CatalogueChallengeItemResponse[]
    >("/social/challenges");

    if (!raw) return [];

    // Backend có thể trả thẳng array hoặc object { catalogue: [...] }
    if (Array.isArray(raw)) return raw;
    if (Array.isArray((raw as any).catalogue)) return (raw as any).catalogue;

    return [];
  } catch (err: any) {
    if (err?.status === 403) {
      // Nếu cached profile vẫn nói onboarding_done=true thì 403 này là
      // transient backend inconsistency — không show alert, chỉ log warning.
      if (isOnboardedFromCache()) {
        console.warn(
          "[ChallengeService] 403 ignored — cached profile says onboarding_done=true (transient backend)",
        );
        return [];
      }
      console.warn(
        "[ChallengeService] Catalogue blocked (ONBOARDING_REQUIRED 403):",
        err,
      );
    } else {
      console.warn("[ChallengeService] Failed to fetch catalogue:", err);
    }
    return [];
  }
}

/**
 * Lấy danh sách challenge user đã tham gia (my_enrollment != null).
 * Backend: GET /social/challenges → filter my_enrollment
 */
export async function getMyChallenges(): Promise<
  CatalogueChallengeItemResponse[]
> {
  try {
    const catalogue = await getChallengeCatalogue();
    // Chỉ lấy challenge có my_enrollment (user đã join)
    return catalogue.filter((c) => c.my_enrollment != null);
  } catch {
    return [];
  }
}

/**
 * Tham gia một challenge.
 * Backend: POST /social/challenges/:id/join
 */
export async function joinChallenge(
  challengeId: number,
): Promise<{ enrollment_id: number } | null> {
  try {
    return await api.post<{ enrollment_id: number }>(
      `/social/challenges/${challengeId}/join`,
    );
  } catch (err: any) {
    console.warn("[ChallengeService] Failed to join challenge:", err);
    return null;
  }
}

// ── Challenge Progress types ──────────────────────────────────────────────

export type DayGridItem = {
  date: string;
  met_goal: boolean | null;
};

export type ChallengeInfo = {
  id: number;
  name: string;
  type: string;
};

export type MyProgress = {
  enrollment_id: number;
  start_date: string;
  end_date: string;
  day_current: number;
  day_total: number;
  grid: DayGridItem[];
  badge_awarded: boolean;
};

export type FriendProgress = {
  user_id: number;
  display_name: string;
  avatar_url: string;
  grid: DayGridItem[];
};

export type ChallengeProgressData = {
  challenge: ChallengeInfo;
  my_progress: MyProgress;
  friends_progress: FriendProgress[];
};

/**
 * Lấy tiến độ một challenge.
 * Backend: GET /social/challenges/:id/progress
 */
export async function getChallengeProgress(
  challengeId: number,
): Promise<ChallengeProgressData | null> {
  try {
    return await api.get<ChallengeProgressData>(
      `/social/challenges/${challengeId}/progress`,
    );
  } catch (err: any) {
    console.warn("[ChallengeService] Failed to fetch progress:", err);
    return null;
  }
}

/**
 * Rời bỏ một challenge.
 * Backend: DELETE /social/challenges/:id/enrollment
 */
export async function abandonChallenge(
  challengeId: number,
): Promise<boolean> {
  try {
    await api.delete(`/social/challenges/${challengeId}/enrollment`);
    return true;
  } catch (err: any) {
    console.warn("[ChallengeService] Failed to abandon challenge:", err);
    return false;
  }
}

// ── Leaderboard types ─────────────────────────────────────────────────────

export type LeaderboardEntry = {
  rank: number;
  user_id: number;
  display_name: string;
  avatar_url: string;
  goals_completed: number;
  is_me: boolean;
};

export type LeaderboardData = {
  week_start: string;
  week_end: string;
  note: string;
  rankings: LeaderboardEntry[];
};

/**
 * Lấy bảng xếp hạng hàng tuần.
 * Backend: GET /social/leaderboard
 */
export async function getLeaderboard(): Promise<LeaderboardData | null> {
  try {
    return await api.get<LeaderboardData>("/social/leaderboard");
  } catch (err: any) {
    console.warn("[ChallengeService] Failed to fetch leaderboard:", err);
    return null;
  }
}
