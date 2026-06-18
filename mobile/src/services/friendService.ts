import { api } from "@/lib/apiClient";

/* =========================
   TYPES
========================= */

export type FriendSearchItem = {
  user_id: number;
  display_name: string;
  avatar_url?: string;
  email?: string;
  friendship_status: "none" | "pending_sent" | "pending_received" | "friends";
};

export type FriendItem = {
  user_id: number;
  display_name: string;
  avatar_url?: string;
  current_streak: number;
  last_activity_at?: string;
};

export type PendingRequestItem = {
  friendship_id: number;
  requester: {
    user_id: number;
    display_name: string;
    avatar_url?: string;
  };
};

/* =========================
   SEARCH USER
========================= */

export const searchUsers = async (
  keyword: string,
): Promise<{ items: FriendSearchItem[] }> => {
  return await api.get(`/social/users/search?q=${keyword}`);
};

/* =========================
   SEND FRIEND REQUEST
========================= */

export const sendFriendRequest = async (userId: number) => {
  return await api.post("/social/friends/request", {
    addressee_id: userId,
  });
};

/* =========================
   GET FRIENDS
========================= */

export const getFriends = async (): Promise<{
  friends: FriendItem[];
  pending_received: PendingRequestItem[];
}> => {
  return await api.get("/social/friends");
};

/* =========================
   ACCEPT / REJECT REQUEST
========================= */

export const respondFriendRequest = async (
  friendshipId: number,
  action: "accept" | "reject",
) => {
  return await api.patch(`/social/friends/request/${friendshipId}`, {
    action,
  });
};

/* =========================
   CANCEL SENT REQUEST
========================= */

export const cancelFriendRequest = async (friendshipId: number) => {
  return await api.delete(`/social/friends/request/${friendshipId}`);
};

/* =========================
   REMOVE FRIEND
========================= */

export const removeFriend = async (userId: number) => {
  return await api.delete(`/social/friends/${userId}`);
};
