package dto

import "time"

// --- POST /api/v1/profile/onboarding ---

// OnboardingRequest is the request body for completing onboarding.
type OnboardingRequest struct {
	Age           int     `json:"age"            binding:"required,min=10,max=120"`
	Gender        string  `json:"gender"         binding:"required,oneof=MALE FEMALE"`
	HeightCm      float64 `json:"height_cm"      binding:"required,min=50,max=300"`
	WeightKg      float64 `json:"weight_kg"      binding:"required,min=15,max=500"`
	Goal          string  `json:"goal"           binding:"required,oneof=LOSE_WEIGHT GAIN_MUSCLE MAINTAIN EAT_HEALTHIER"`
	ActivityLevel string  `json:"activity_level" binding:"required,oneof=SEDENTARY LIGHTLY_ACTIVE MODERATELY_ACTIVE VERY_ACTIVE"`
}

// OnboardingResponse contains the calculated targets returned after onboarding.
type OnboardingResponse struct {
	BMI            float64 `json:"bmi"`
	BMICategory    string  `json:"bmi_category"`
	BMR            float64 `json:"bmr"`
	TDEE           float64 `json:"tdee"`
	CalorieTarget  float64 `json:"calorie_target"`
	ProteinTargetG float64 `json:"protein_target_g"`
	CarbTargetG    float64 `json:"carb_target_g"`
	FatTargetG     float64 `json:"fat_target_g"`
	WaterTargetMl  int     `json:"water_target_ml"`
}

// --- GET /api/v1/profile ---
// --- PATCH /api/v1/profile (response) ---

// ProfileResponse is the full profile returned by GET and PATCH /profile.
type ProfileResponse struct {
	UserID         uint      `json:"user_id"`
	DisplayName    string    `json:"display_name"`
	AvatarURL      string    `json:"avatar_url"`
	Age            int       `json:"age"`
	Gender         string    `json:"gender"`
	HeightCm       float64   `json:"height_cm"`
	WeightKg       float64   `json:"weight_kg"`
	Goal           string    `json:"goal"`
	ActivityLevel  string    `json:"activity_level"`
	BMI            float64   `json:"bmi"`
	BMICategory    string    `json:"bmi_category"`
	BMR            float64   `json:"bmr"`
	TDEE           float64   `json:"tdee"`
	CalorieTarget  float64   `json:"calorie_target"`
	ProteinTargetG float64   `json:"protein_target_g"`
	CarbTargetG    float64   `json:"carb_target_g"`
	FatTargetG     float64   `json:"fat_target_g"`
	WaterTargetMl  int       `json:"water_target_ml"`
	SocialEnabled  bool      `json:"social_enabled"`
	OnboardingDone bool      `json:"onboarding_done"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// --- PATCH /api/v1/profile ---

// UpdateProfileRequest holds optional fields for a partial profile update.
// At least one field must be present (enforced at service layer).
type UpdateProfileRequest struct {
	Age           *int     `json:"age"`
	Gender        *string  `json:"gender"`
	HeightCm      *float64 `json:"height_cm"`
	WeightKg      *float64 `json:"weight_kg"`
	Goal          *string  `json:"goal"`
	ActivityLevel *string  `json:"activity_level"`
}

// --- PATCH /api/v1/profile/social ---

// SocialToggleRequest is the request body for toggling the social feature.
type SocialToggleRequest struct {
	SocialEnabled bool `json:"social_enabled"`
}

// SocialToggleResponse is returned after toggling the social feature.
type SocialToggleResponse struct {
	SocialEnabled bool `json:"social_enabled"`
}
