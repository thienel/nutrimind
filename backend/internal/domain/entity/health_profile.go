package entity

import "time"

// Gender constants
const (
	GenderMale   = "MALE"
	GenderFemale = "FEMALE"
)

// Goal constants
const (
	GoalLoseWeight   = "LOSE_WEIGHT"
	GoalMaintain     = "MAINTAIN"
	GoalGainMuscle   = "GAIN_MUSCLE"
	GoalEatHealthier = "EAT_HEALTHIER"
)

// ActivityLevel constants
const (
	ActivitySedentary        = "SEDENTARY"
	ActivityLightlyActive    = "LIGHTLY_ACTIVE"
	ActivityModeratelyActive = "MODERATELY_ACTIVE"
	ActivityVeryActive       = "VERY_ACTIVE"
)

// BMI category labels
const (
	BMICategoryUnderweight = "Underweight"
	BMICategoryNormal      = "Normal"
	BMICategoryOverweight  = "Overweight"
	BMICategoryObese       = "Obese"
)

// HealthProfile stores the user's physical information, health goals,
// and pre-computed nutrition targets (1-1 with User).
type HealthProfile struct {
	ID            uint      `gorm:"primaryKey;autoIncrement"`
	UserID        uint      `gorm:"uniqueIndex;not null"`
	Age           int       `gorm:"not null"`
	Gender        string    `gorm:"not null"`
	HeightCm      float64   `gorm:"column:height_cm;not null"`
	WeightKg      float64   `gorm:"column:weight_kg;not null"`
	Goal          string    `gorm:"not null"`
	ActivityLevel string    `gorm:"column:activity_level;not null"`
	BMI           float64   `gorm:"column:bmi"`
	BMR           float64   `gorm:"column:bmr"`
	TDEE          float64   `gorm:"column:tdee"`
	CalorieTarget float64   `gorm:"column:calorie_target"`
	ProteinTargetG float64  `gorm:"column:protein_target_g"`
	CarbTargetG   float64   `gorm:"column:carb_target_g"`
	FatTargetG    float64   `gorm:"column:fat_target_g"`
	WaterTargetMl int       `gorm:"column:water_target_ml"`
	SocialEnabled bool      `gorm:"column:social_enabled;default:true;not null"`
	OnboardingDone bool     `gorm:"column:onboarding_done;default:false;not null"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// BMICategory returns the WHO BMI classification label for a given BMI value.
func BMICategory(bmi float64) string {
	switch {
	case bmi < 18.5:
		return BMICategoryUnderweight
	case bmi < 25.0:
		return BMICategoryNormal
	case bmi < 30.0:
		return BMICategoryOverweight
	default:
		return BMICategoryObese
	}
}

// IsValidGender checks if gender value is valid.
func IsValidGender(g string) bool {
	return g == GenderMale || g == GenderFemale
}

// IsValidGoal checks if goal value is valid.
func IsValidGoal(g string) bool {
	switch g {
	case GoalLoseWeight, GoalMaintain, GoalGainMuscle, GoalEatHealthier:
		return true
	default:
		return false
	}
}

// IsValidActivityLevel checks if activity level value is valid.
func IsValidActivityLevel(a string) bool {
	switch a {
	case ActivitySedentary, ActivityLightlyActive, ActivityModeratelyActive, ActivityVeryActive:
		return true
	default:
		return false
	}
}
