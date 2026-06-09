package entity

import "gorm.io/gorm"

// Gender constants
const (
	GenderMale   = "MALE"
	GenderFemale = "FEMALE"
	GenderOther  = "OTHER"
)

// Goal constants
const (
	GoalLoseWeight    = "LOSE_WEIGHT"
	GoalMaintain      = "MAINTAIN"
	GoalGainMuscle    = "GAIN_MUSCLE"
	GoalImproveHealth = "IMPROVE_HEALTH"
)

// ActivityLevel constants (PAL-based labels)
const (
	ActivitySedentary        = "SEDENTARY"
	ActivityLightlyActive    = "LIGHTLY_ACTIVE"
	ActivityModeratelyActive = "MODERATELY_ACTIVE"
	ActivityVeryActive       = "VERY_ACTIVE"
	ActivityExtraActive      = "EXTRA_ACTIVE"
)

// HealthProfile stores the user's physical information and health goals.
// It has a 1-1 relationship with User (enforced via unique index on user_id).
type HealthProfile struct {
	gorm.Model
	UserID        uint    `gorm:"uniqueIndex;not null"`
	FullName      string  `gorm:"not null"`
	Age           int     `gorm:"not null"`
	Gender        string  `gorm:"not null"`
	HeightCm      float64 `gorm:"not null"`
	WeightKg      float64 `gorm:"not null"`
	Goal          string  `gorm:"not null"`
	ActivityLevel string  `gorm:"not null"`
}

// IsValidGender checks if gender value is valid
func IsValidGender(g string) bool {
	switch g {
	case GenderMale, GenderFemale, GenderOther:
		return true
	default:
		return false
	}
}

// IsValidGoal checks if goal value is valid
func IsValidGoal(g string) bool {
	switch g {
	case GoalLoseWeight, GoalMaintain, GoalGainMuscle, GoalImproveHealth:
		return true
	default:
		return false
	}
}

// IsValidActivityLevel checks if activity level value is valid
func IsValidActivityLevel(a string) bool {
	switch a {
	case ActivitySedentary, ActivityLightlyActive, ActivityModeratelyActive,
		ActivityVeryActive, ActivityExtraActive:
		return true
	default:
		return false
	}
}
