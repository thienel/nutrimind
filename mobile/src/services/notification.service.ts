import { api } from "@/lib/apiClient";

export async function getUnreadNotifications(): Promise<number> {
  let unreadCount = 0;

  try {
    const notifRaw = await api.get<{ total?: number }>("/notifications");
    if (typeof notifRaw?.total === "number") {
      unreadCount = notifRaw.total;
    }
  } catch (err: any) {
    console.warn("[NotificationService] Notifications fetch failed:", err);
  }

  return unreadCount;
}
