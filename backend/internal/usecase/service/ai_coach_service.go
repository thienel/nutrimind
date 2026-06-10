package service

import "context"

// --- Commands & Results for AICoachService ---

// GetAdviceCommand is the input for GetAdvice.
type GetAdviceCommand struct {
	UserID uint
	Prompt string // optional, extra user prompt
}

// AdviceContextSummary is the data snapshot used when generating daily advice.
type AdviceContextSummary struct {
	CaloriesLogged float64
	CalorieTarget  float64
	WaterMlLogged  int
	WaterTargetMl  int
}

// AdviceResult is the response from GetAdvice.
type AdviceResult struct {
	Advice         string
	Disclaimer     string
	ContextSummary AdviceContextSummary
}

// GetMealSuggestionCommand is the input for GetMealSuggestion.
type GetMealSuggestionCommand struct {
	UserID   uint
	MealType string // BREAKFAST|LUNCH|DINNER|SNACK
}

// MealSuggestionResult is the response from GetMealSuggestion.
type MealSuggestionResult struct {
	Suggestion        string
	EstimatedCalories float64
	EstimatedProteinG float64
	EstimatedCarbG    float64
	EstimatedFatG     float64
	Disclaimer        string
}

// --- AI backend interfaces ---

// NutritionAdviceInput is the pre-built context passed to the AI for daily advice.
type NutritionAdviceInput struct {
	// Health profile
	Age            int
	Gender         string
	WeightKg       float64
	HeightCm       float64
	Goal           string
	ActivityLevel  string
	CalorieTarget  float64
	ProteinTargetG float64
	CarbTargetG    float64
	FatTargetG     float64
	WaterTargetMl  int

	// Today's logged data
	CaloriesLogged float64
	ProteinLogged  float64
	CarbLogged     float64
	FatLogged      float64
	WaterMlLogged  int
	MealCount      int

	// Optional extra prompt from the user
	UserPrompt string
}

// MealSuggestionInput is the pre-built context passed to the AI for meal suggestion.
type MealSuggestionInput struct {
	Goal              string
	MealType          string
	RemainingCalories float64
	RemainingProteinG float64
	RemainingCarbG    float64
	RemainingFatG     float64
}

// NutritionAdvisor is the AI backend interface for the nutrition coach features.
type NutritionAdvisor interface {
	GetDailyAdvice(ctx context.Context, input NutritionAdviceInput) (*AdviceResult, error)
	GetMealSuggestion(ctx context.Context, input MealSuggestionInput) (*MealSuggestionResult, error)
}

// --- Service interface ---

// AICoachService handles AI-powered nutrition advice and meal suggestions.
type AICoachService interface {
	GetAdvice(ctx context.Context, cmd GetAdviceCommand) (*AdviceResult, error)
	GetMealSuggestion(ctx context.Context, cmd GetMealSuggestionCommand) (*MealSuggestionResult, error)
}
