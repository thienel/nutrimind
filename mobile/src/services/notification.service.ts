import { api } from "@/lib/apiClient";

// =======================================================
// Đăng ký FCM token với backend để nhận push notification.
// Gọi sau khi user đăng nhập thành công.
// Backend: POST /notifications/fcm-token
// =======================================================
export async function registerFCMToken(
  fcmToken: string,
  platform: "android" | "ios",
): Promise<void> {
  try {
    await api.post("/notifications/fcm-token", {
      fcm_token: fcmToken,
      platform,
    });
    console.log("[FCM] Token registered successfully");
  } catch (err: any) {
    console.warn("[FCM] Failed to register token:", err?.message ?? err);
  }
}

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
