package dto

import "time"

// LogWeightRequest is the request body for POST /api/v1/health/weight.
type LogWeightRequest struct {
	WeightKg        float64    `json:"weight_kg" binding:"required,min=15,max=500"`
	LoggedAt        string     `json:"logged_at" binding:"required"`
	Note            string     `json:"note" binding:"max=200"`
	ClientCreatedAt *time.Time `json:"client_created_at"`
}

// WeightLogResponse is the response for a single weight log entry.
type WeightLogResponse struct {
	ID          uint      `json:"id"`
	WeightKg    float64   `json:"weight_kg"`
	LoggedAt    string    `json:"logged_at"` // YYYY-MM-DD
	Note        string    `json:"note,omitempty"`
	BMI         float64   `json:"bmi"`
	BMICategory string    `json:"bmi_category"`
	CreatedAt   time.Time `json:"created_at"`
}

// WeightHistoryResponse wraps a paginated weight history list.
type WeightHistoryResponse struct {
	Items  []WeightLogResponse `json:"items"`
	Total  int64               `json:"total"`
	Limit  int                 `json:"limit"`
	Offset int                 `json:"offset"`
}

// LatestWeightSummary is the latest weight point within HealthSummaryResponse.
type LatestWeightSummary struct {
	WeightKg float64 `json:"weight_kg"`
	LoggedAt string  `json:"logged_at"`
}

// WeightPointDTO is a (date, weight) pair used in the history chart.
type WeightPointDTO struct {
	LoggedAt string  `json:"logged_at"`
	WeightKg float64 `json:"weight_kg"`
}

// HealthSummaryResponse is the response for GET /api/v1/health/summary.
type HealthSummaryResponse struct {
	BMI            float64              `json:"bmi"`
	BMICategory    string               `json:"bmi_category"`
	BMR            float64              `json:"bmr"`
	TDEE           float64              `json:"tdee"`
	CalorieTarget  float64              `json:"calorie_target"`
	ProteinTargetG float64              `json:"protein_target_g"`
	CarbTargetG    float64              `json:"carb_target_g"`
	FatTargetG     float64              `json:"fat_target_g"`
	WaterTargetMl  int                  `json:"water_target_ml"`
	LatestWeight   *LatestWeightSummary `json:"latest_weight"`
	WeightHistory  []WeightPointDTO     `json:"weight_history"`
}
