import { api } from "@/lib/apiClient";

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
export async function getMyProfile(): Promise<ProfileResponse> {
  return api.get("/profile");
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
