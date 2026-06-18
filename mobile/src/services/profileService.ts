import { api } from "@/lib/apiClient";

// payload onboarding
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

// response profile
export type ProfileResponse = {
  user_id: number;
  display_name: string;
  avatar_url: string;

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

  bmi: number;
  bmi_category: string;
  bmr: number;
  tdee: number;
  calorie_target: number;
  protein_target_g: number;
  carb_target_g: number;
  fat_target_g: number;
  water_target_ml: number;

  social_enabled: boolean;
  onboarding_done: boolean;
};

// onboarding
export async function completeOnboarding(payload: OnboardingPayload) {
  return api.post("/profile/onboarding", payload);
}

// lấy profile hiện tại
export async function getMyProfile(): Promise<ProfileResponse> {
  return api.get("/profile");
}

// update profile
export async function updateProfile(
  payload: Partial<OnboardingPayload>,
): Promise<ProfileResponse> {
  return api.patch("/profile", payload);
}
