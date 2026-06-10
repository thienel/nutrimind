package dto

import "time"

// LogMealRequest is the request body for POST /api/v1/meals.
type LogMealRequest struct {
	FoodName        string     `json:"food_name"      binding:"required,max=200"`
	MealType        string     `json:"meal_type"      binding:"required,oneof=BREAKFAST LUNCH DINNER SNACK"`
	Calories        float64    `json:"calories"       binding:"required,gt=0"`
	ProteinG        float64    `json:"protein_g"`
	CarbG           float64    `json:"carb_g"`
	FatG            float64    `json:"fat_g"`
	Source          string     `json:"source"         binding:"required,oneof=MANUAL AI_PHOTO"`
	AIConfidence    *float64   `json:"ai_confidence"`
	LoggedDate      string     `json:"logged_date"    binding:"required"`
	ClientCreatedAt *time.Time `json:"client_created_at"`
}

// MealEntryResponse is a single meal entry in the response.
type MealEntryResponse struct {
	ID         uint      `json:"id"`
	FoodName   string    `json:"food_name"`
	MealType   string    `json:"meal_type"`
	Calories   float64   `json:"calories"`
	ProteinG   float64   `json:"protein_g"`
	CarbG      float64   `json:"carb_g"`
	FatG       float64   `json:"fat_g"`
	Source     string    `json:"source"`
	LoggedDate string    `json:"logged_date"` // YYYY-MM-DD
	CreatedAt  time.Time `json:"created_at"`
}

// MealDailyTotalsResponse holds summed macros for a day.
type MealDailyTotalsResponse struct {
	Calories float64 `json:"calories"`
	ProteinG float64 `json:"protein_g"`
	CarbG    float64 `json:"carb_g"`
	FatG     float64 `json:"fat_g"`
}

// MealsByTypeResponse groups meal entries by meal type.
type MealsByTypeResponse struct {
	Breakfast []MealEntryResponse `json:"breakfast"`
	Lunch     []MealEntryResponse `json:"lunch"`
	Dinner    []MealEntryResponse `json:"dinner"`
	Snack     []MealEntryResponse `json:"snack"`
}

// DailyMealsResponse is the response for GET /api/v1/meals?date=...
type DailyMealsResponse struct {
	Date        string                  `json:"date"`
	Meals       MealsByTypeResponse     `json:"meals"`
	DailyTotals MealDailyTotalsResponse `json:"daily_totals"`
}

// AIAnalysisResponse is the response for POST /api/v1/meals/ai-analyze.
type AIAnalysisResponse struct {
	FoodName      string  `json:"food_name"`
	Calories      float64 `json:"calories"`
	ProteinG      float64 `json:"protein_g"`
	CarbG         float64 `json:"carb_g"`
	FatG          float64 `json:"fat_g"`
	Confidence    float64 `json:"confidence"`
	LowConfidence bool    `json:"low_confidence"`
	Disclaimer    string  `json:"disclaimer"`
}
