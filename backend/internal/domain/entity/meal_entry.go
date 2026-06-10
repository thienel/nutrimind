package entity

import "time"

const (
	MealTypeBreakfast = "BREAKFAST"
	MealTypeLunch     = "LUNCH"
	MealTypeDinner    = "DINNER"
	MealTypeSnack     = "SNACK"

	MealSourceManual  = "MANUAL"
	MealSourceAIPhoto = "AI_PHOTO"

	MealFoodNameMaxLen    = 200
	AIConfidenceThreshold = 0.70
)

// MealEntry records a single food item logged for a meal.
type MealEntry struct {
	ID              uint       `gorm:"primaryKey;autoIncrement"`
	UserID          uint       `gorm:"not null;index"`
	FoodName        string     `gorm:"not null;size:200"`
	MealType        string     `gorm:"not null"`
	Calories        float64    `gorm:"not null"`
	ProteinG        float64    `gorm:"column:protein_g;default:0;not null"`
	CarbG           float64    `gorm:"column:carb_g;default:0;not null"`
	FatG            float64    `gorm:"column:fat_g;default:0;not null"`
	Source          string     `gorm:"not null"`
	AIConfidence    *float64   `gorm:"column:ai_confidence"`
	LoggedDate      time.Time  `gorm:"column:logged_date;not null;type:date"`
	ClientCreatedAt *time.Time `gorm:"column:client_created_at"`
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

func IsValidMealType(t string) bool {
	switch t {
	case MealTypeBreakfast, MealTypeLunch, MealTypeDinner, MealTypeSnack:
		return true
	}
	return false
}

func IsValidMealSource(s string) bool {
	return s == MealSourceManual || s == MealSourceAIPhoto
}
