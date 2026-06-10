package dto

// GetAdviceRequest is the body for POST /ai/advice.
type GetAdviceRequest struct {
	Prompt string `json:"prompt"` // optional
}

// AdviceContextSummaryResponse is the data snapshot embedded in the advice response.
type AdviceContextSummaryResponse struct {
	CaloriesLogged float64 `json:"calories_logged"`
	CalorieTarget  float64 `json:"calorie_target"`
	WaterMlLogged  int     `json:"water_ml_logged"`
	WaterTargetMl  int     `json:"water_target_ml"`
}

// AdviceResponse is the body returned by POST /ai/advice.
type AdviceResponse struct {
	Advice         string                       `json:"advice"`
	Disclaimer     string                       `json:"disclaimer"`
	ContextSummary AdviceContextSummaryResponse `json:"context_summary"`
}

// GetMealSuggestionRequest is the body for POST /ai/meal-suggestion.
type GetMealSuggestionRequest struct {
	MealType string `json:"meal_type" binding:"required,oneof=BREAKFAST LUNCH DINNER SNACK"`
}

// MealSuggestionResponse is the body returned by POST /ai/meal-suggestion.
type MealSuggestionResponse struct {
	Suggestion        string  `json:"suggestion"`
	EstimatedCalories float64 `json:"estimated_calories"`
	EstimatedProteinG float64 `json:"estimated_protein_g"`
	EstimatedCarbG    float64 `json:"estimated_carb_g"`
	EstimatedFatG     float64 `json:"estimated_fat_g"`
	Disclaimer        string  `json:"disclaimer"`
}
