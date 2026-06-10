package service

import (
	"context"
	"time"
)

// AILowConfidenceThreshold is the confidence below which an AI analysis is flagged as low confidence.
const AILowConfidenceThreshold = 0.70

// MealDupChecker checks if a meal submission is a duplicate within a short time window.
// Implementations should fail open (return false) on infrastructure errors.
type MealDupChecker interface {
	CheckAndMark(ctx context.Context, key string, ttl time.Duration) (isDup bool, err error)
}

// FoodPhotoAnalyzer analyzes food from an image using AI vision.
type FoodPhotoAnalyzer interface {
	AnalyzeFood(ctx context.Context, imageData []byte, mimeType string, description string) (*AIAnalysisResult, error)
}

// LogMealCommand is the input for logging a meal entry.
type LogMealCommand struct {
	UserID          uint
	FoodName        string
	MealType        string     // BREAKFAST | LUNCH | DINNER | SNACK
	Calories        float64
	ProteinG        float64
	CarbG           float64
	FatG            float64
	Source          string     // MANUAL | AI_PHOTO
	AIConfidence    *float64
	LoggedDate      time.Time
	ClientCreatedAt *time.Time
}

// MealEntryResult is the output for a single meal entry.
type MealEntryResult struct {
	ID         uint
	FoodName   string
	MealType   string
	Calories   float64
	ProteinG   float64
	CarbG      float64
	FatG       float64
	Source     string
	LoggedDate time.Time
	CreatedAt  time.Time
}

// MealDailyTotals holds summed macros for a day.
type MealDailyTotals struct {
	Calories float64
	ProteinG float64
	CarbG    float64
	FatG     float64
}

// DailyMealsResult groups meal entries by type and includes daily totals.
type DailyMealsResult struct {
	Date        time.Time
	Breakfast   []MealEntryResult
	Lunch       []MealEntryResult
	Dinner      []MealEntryResult
	Snack       []MealEntryResult
	DailyTotals MealDailyTotals
}

// AIAnalysisResult contains the food nutrition analysis from AI vision.
type AIAnalysisResult struct {
	FoodName      string
	Calories      float64
	ProteinG      float64
	CarbG         float64
	FatG          float64
	Confidence    float64
	LowConfidence bool
	Disclaimer    string
}

// MealService handles meal logging and nutrition tracking.
type MealService interface {
	LogMeal(ctx context.Context, cmd LogMealCommand) (*MealEntryResult, error)
	GetMealsByDate(ctx context.Context, userID uint, date time.Time) (*DailyMealsResult, error)
	DeleteMeal(ctx context.Context, userID, mealID uint) error
	AnalyzePhoto(ctx context.Context, imageData []byte, mimeType string, description string) (*AIAnalysisResult, error)
}
