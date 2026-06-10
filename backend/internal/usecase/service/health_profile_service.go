package service

import (
	"context"

	"nutrimind-backend/internal/domain/entity"
)

// HealthProfileService defines use cases for profile management.
type HealthProfileService interface {
	// Onboarding creates or overwrites the health profile and marks onboarding as done.
	// Returns the pre-computed nutrition targets.
	Onboarding(ctx context.Context, cmd OnboardingCommand) (*OnboardingResult, error)

	// GetProfile returns the full profile data including user display info.
	GetProfile(ctx context.Context, userID uint) (*ProfileData, error)

	// UpdateProfile applies a partial update, recalculates all targets,
	// and auto-creates a weight entry when weight_kg changes.
	UpdateProfile(ctx context.Context, cmd UpdateProfileCommand) (*ProfileData, error)

	// ToggleSocial sets the social_enabled flag and returns its new value.
	ToggleSocial(ctx context.Context, userID uint, enabled bool) (bool, error)
}

// OnboardingCommand holds the data submitted during onboarding.
type OnboardingCommand struct {
	UserID        uint
	Age           int
	Gender        string
	HeightCm      float64
	WeightKg      float64
	Goal          string
	ActivityLevel string
}

// OnboardingResult contains the calculated nutrition targets.
type OnboardingResult struct {
	BMI            float64
	BMICategory    string
	BMR            float64
	TDEE           float64
	CalorieTarget  float64
	ProteinTargetG float64
	CarbTargetG    float64
	FatTargetG     float64
	WaterTargetMl  int
}

// ProfileData is the full profile + user display info used by GET and PATCH /profile.
type ProfileData struct {
	Profile     *entity.HealthProfile
	DisplayName string
	AvatarURL   string
}

// UpdateProfileCommand holds the optional fields for a partial profile update.
// Nil pointer means "not provided / do not change".
type UpdateProfileCommand struct {
	UserID        uint
	Age           *int
	Gender        *string
	HeightCm      *float64
	WeightKg      *float64
	Goal          *string
	ActivityLevel *string
}
