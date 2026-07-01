import { api } from "@/lib/apiClient";

// Cache in-memory với TTL: tránh duplicate GET /profile
// và chống transient 404 từ backend.
//
// Khi backend trả về 404 nhưng cache cũ có onboarding_done=true,
// ta giữ cache cũ và log warning — không cho phép 404 transient
// phá vỡ trạng thái đã onboarded của user.
let profileCachedData: ProfileResponse | null = null;
let profileCachedAt = 0;
const PROFILE_CACHE_TTL_MS = 30_000; // 30 giây

// Single-flight: đảm bảo chỉ 1 GET /profile request chạy tại một thời điểm
// Các caller khác sẽ await promise này thay vì gọi API lại
let profileFetchPromise: Promise<ProfileResponse> | null = null;

// Trace: log caller info for debugging inconsistent responses
let profileCallerTrace: {
  file: string;
  route: string;
  userId?: number;
} | null = null;

// =======================================================
// Payload gửi lên backend khi user setup onboarding
// hoặc update personal information
//
// Dùng chung cho:
// - completeOnboarding()
// - updateProfile()
// =======================================================
export type OnboardingPayload = {
  age: number;
  gender: "MALE" | "FEMALE";
  height_cm: number;
  weight_kg: number;
  goal: "LOSE_WEIGHT" | "GAIN_MUSCLE" | "MAINTAIN" | "EAT_HEALTHIER";
  activity_level:
    | "SEDENTARY"
    | "LIGHTLY_ACTIVE"
    | "MODERATELY_ACTIVE"
    | "VERY_ACTIVE";
};

// =======================================================
// Kiểu dữ liệu profile trả về từ backend
//
// Bao gồm:
// - thông tin cá nhân
// - chỉ số sức khỏe
// - mục tiêu calories/macros
// =======================================================
export type ProfileResponse = {
  // id user
  user_id: number;

  // tên hiển thị
  display_name: string;

  // avatar user
  avatar_url: string;

  // email
  email: string;

  // thông tin cơ bản
  age: number;
  gender: "MALE" | "FEMALE";
  height_cm: number;
  weight_kg: number;

  // mục tiêu hiện tại
  goal: "LOSE_WEIGHT" | "GAIN_MUSCLE" | "MAINTAIN" | "EAT_HEALTHIER";

  // mức độ vận động
  activity_level:
    | "SEDENTARY"
    | "LIGHTLY_ACTIVE"
    | "MODERATELY_ACTIVE"
    | "VERY_ACTIVE";

  // ===== Chỉ số sức khỏe =====
  bmi: number;
  bmi_category: string;

  bmr: number;
  tdee: number;

  // ===== Mục tiêu dinh dưỡng mỗi ngày =====
  calorie_target: number;
  protein_target_g: number;
  carb_target_g: number;
  fat_target_g: number;

  // mục tiêu nước uống mỗi ngày
  water_target_ml: number;

  // bật/tắt social features
  social_enabled: boolean;

  // đã hoàn thành onboarding chưa
  onboarding_done: boolean;
};

// =======================================================
// Tạo profile lần đầu (onboarding)
//
// Flow:
// User mới đăng ký
// -> nhập personal info
// -> gọi API để tạo profile
// =======================================================
export async function completeOnboarding(
  payload: OnboardingPayload,
): Promise<ProfileResponse> {
  return api.post("/profile/onboarding", payload);
}

// =======================================================
// Lấy profile hiện tại của user đang đăng nhập
//
// Dùng ở:
// - Profile screen
// - Personal Information screen
// - App layout check setup
// =======================================================
/**
 * Kiểm tra cache xem onboarding_done = true không.
 * Không gọi API — chỉ đọc cache in-memory.
 * Dùng trong các service (challenge, social) để quyết định
 * có bỏ qua ONBOARDING_REQUIRED error từ backend hay không.
 */
export function isOnboardedFromCache(): boolean {
  return profileCachedData?.onboarding_done === true;
}

/** Xoá cache — gọi khi user sign out để tránh dùng data cũ */
export function clearProfileCache(): void {
  profileCachedData = null;
  profileCachedAt = 0;
  profileFetchPromise = null;
  profileCallerTrace = null;
}

export async function getMyProfile(options?: {
  file?: string;
  route?: string;
}): Promise<ProfileResponse> {
  const callerFile = options?.file || "unknown";
  const callerRoute = options?.route || "unknown";

  // Trace caller for debugging
  console.log(`[ProfileCaller] file=${callerFile} route=${callerRoute}`);

  // Cache hit: nếu profile đã fetch trong vòng PROFILE_CACHE_TTL_MS thì dùng lại
  const now = Date.now();
  if (profileCachedData && now - profileCachedAt < PROFILE_CACHE_TTL_MS) {
    console.log(
      `[ProfileCaller] Cache HIT (${Math.round((now - profileCachedAt) / 1000)}s old) for ${callerFile}:${callerRoute}`,
    );
    return profileCachedData;
  }

  // Nếu đang có request đang chạy -> reuse
  if (profileFetchPromise) {
    console.log(
      `[ProfileCaller] Reusing in-flight profile request from ${profileCallerTrace?.file || "unknown"}`,
    );
    return profileFetchPromise;
  }

  // Tạo request mới
  let rejectPromise: (reason: any) => void;
  profileFetchPromise = new Promise<ProfileResponse>((resolve, reject) => {
    rejectPromise = reject;

    api
      .get<ProfileResponse>("/profile")
      .then((profile) => {
        // Thành công: ghi cache và trả về
        profileCachedData = profile;
        profileCachedAt = Date.now();
        console.log(
          `[ProfileCache] FETCH_OK authUserId=${profile.user_id} onboarding_done=${profile.onboarding_done}`,
        );
        resolve(profile);
      })
      .catch((err: any) => {
        if (err?.status === 404 && profileCachedData?.onboarding_done === true) {
          // Backend transient 404 nhưng cache vẫn có onboarding_done=true
          // → giữ cache cũ, không cho phép 404 transient phá onboarding state
          console.warn(
            `[ProfileCache] 404 ignored — using cached profile (${Math.round((Date.now() - profileCachedAt) / 1000)}s old) for ${callerFile}:${callerRoute}`,
          );
          resolve(profileCachedData);
          return;
        }

        // Các lỗi khác (5xx, network, 404 không có cache) → reject
        console.warn(
          `[ProfileCache] FETCH_FAIL from ${callerFile}:${callerRoute} — status=${err?.status}`,
        );
        reject(err);
      })
      .finally(() => {
        profileFetchPromise = null;
        profileCallerTrace = null;
      });
  });

  // Store caller info for debugging
  profileCallerTrace = { file: callerFile, route: callerRoute };

  return profileFetchPromise;
}

// =======================================================
// Update profile đã tồn tại
//
// Partial<> nghĩa là có thể update 1 phần
// không bắt buộc gửi full object
// =======================================================
export async function updateProfile(
  payload: Partial<OnboardingPayload>,
): Promise<ProfileResponse> {
  return api.patch("/profile", payload);
}
