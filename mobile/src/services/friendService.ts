import { api } from "@/lib/apiClient";

/* =========================================================
   KHAI BÁO CÁC KIỂU DỮ LIỆU (TYPE)
========================================================= */

/**
 * Dữ liệu trả về khi search user để add friend
 */
export type FriendSearchItem = {
  user_id: number;
  display_name: string;
  avatar_url?: string;

  // trạng thái quan hệ với user hiện tại
  friendship_status: "none" | "pending_sent" | "pending_received" | "friends";
};

/**
 * Dữ liệu 1 người bạn trong danh sách bạn bè
 */
export type FriendItem = {
  user_id: number;
  display_name: string;
  avatar_url?: string;

  // số ngày streak liên tục
  current_streak: number;

  // thời gian hoạt động gần nhất
  last_activity_at?: string;
};

/**
 * Dữ liệu lời mời kết bạn đang chờ
 */
export type PendingRequestItem = {
  friendship_id: number;
  user_id: number;
  display_name: string;
  avatar_url?: string;
  requested_at: string;
};

/* =========================================================
   SEARCH USER
========================================================= */

/**
 * Tìm kiếm user theo keyword (tên hoặc email)
 *
 * API:
 * GET /social/users/search?q=
 */
export const searchUsers = async (
  keyword: string,
): Promise<{ items: FriendSearchItem[] }> => {
  return api.get(`/social/users/search?q=${keyword}`);
};

/* =========================================================
   GỬI LỜI MỜI KẾT BẠN
========================================================= */

/**
 * Gửi request kết bạn tới user khác
 *
 * API:
 * POST /social/friends/request
 */
export const sendFriendRequest = async (userId: number) => {
  return api.post("/social/friends/request", {
    addressee_id: userId,
  });
};

/* =========================================================
   LẤY DANH SÁCH BẠN BÈ
========================================================= */

/**
 * Lấy:
 * - danh sách bạn bè
 * - lời mời đang chờ nhận
 *
 * API:
 * GET /social/friends
 */
export const getFriends = async (): Promise<{
  friends: FriendItem[];
  pending_received: PendingRequestItem[];
}> => {
  return api.get("/social/friends");
};

/* =========================================================
   CHẤP NHẬN / TỪ CHỐI KẾT BẠN
========================================================= */

/**
 * Xử lý lời mời kết bạn
 *
 * action:
 * - accept = chấp nhận
 * - decline = từ chối
 *
 * API:
 * PATCH /social/friends/request/:id
 */
export const respondFriendRequest = async (
  friendshipId: number,
  action: "accept" | "decline",
): Promise<{ status: string }> => {
  return api.patch(`/social/friends/request/${friendshipId}`, {
    action,
  });
};

/* =========================================================
   HỦY LỜI MỜI ĐÃ GỬI
========================================================= */

/**
 * Hủy request mình đã gửi cho người khác
 *
 * API:
 * DELETE /social/friends/request/:id
 */
export const cancelFriendRequest = async (friendshipId: number) => {
  return api.delete(`/social/friends/request/${friendshipId}`);
};

/* =========================================================
   XÓA BẠN
========================================================= */

/**
 * Xóa bạn khỏi danh sách
 *
 * API:
 * DELETE /social/friends/:userId
 */
export const removeFriend = async (userId: number) => {
  return api.delete(`/social/friends/${userId}`);
};

/* =========================================================
   GỬI CHEER (ĐỘNG VIÊN)
========================================================= */

/**
 * Gửi reaction động viên cho bạn bè
 *
 * reaction:
 * - keep_going
 * - nice_job
 * - great_progress
 *
 * API:
 * POST /social/cheer
 */
export const sendCheer = async (
  recipientId: number,
  reaction: "keep_going" | "nice_job" | "great_progress",
) => {
  try {
    console.log("CHEER PAYLOAD:", {
      recipient_id: recipientId,
      reaction,
    });

    return await api.post("/social/cheer", {
      recipient_id: recipientId,
      reaction, // giữ nguyên lowercase
    });
  } catch (error: any) {
    console.log("CHEER ERROR FULL:", JSON.stringify(error, null, 2));
    throw error;
  }
};
