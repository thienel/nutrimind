import { api } from "@/lib/apiClient";

// =======================================================
// Lấy số lượng notification chưa đọc
//
// Dùng cho HomeScreen:
// - hiển thị badge đỏ trên icon chuông
// =======================================================
export async function getUnreadNotifications(): Promise<number> {
  // Giá trị mặc định nếu chưa có notification
  let unreadCount = 0;

  try {
    // =======================================================
    // Backend trả về { items: Notification[], total: number }
    // =======================================================
    const notifRaw = await api.get<{
      items?: unknown[];
      total?: number;
    }>("/notifications");

    // =======================================================
    // Ưu tiên lấy total từ backend
    // Nếu không có total thì đếm từ items
    // Nếu cả 2 đều không có -> fallback 0
    // =======================================================
    if (typeof notifRaw?.total === "number") {
      // Backend trả total trực tiếp
      unreadCount = notifRaw.total;
    } else if (Array.isArray(notifRaw?.items)) {
      // Fallback: đếm từ items nếu backend không gửi total
      unreadCount = notifRaw.items.length;
    }
  } catch (err: any) {
    // Nếu API lỗi thì log warning
    // nhưng không làm crash app
    console.warn("[NotificationService] Notifications fetch failed:", err);
  }

  // Trả số unread cuối cùng
  // nếu API fail thì vẫn là 0
  return unreadCount;
}
