package service

import (
	"context"
	"time"
)

// HealthMetricService handles POST /health/weight, GET /health/weight, GET /health/summary.
type HealthMetricService interface {
	// LogWeight records (or updates) a weight measurement and syncs the health profile.
	// Returns 403 ONBOARDING_REQUIRED if the user has not completed onboarding.
	LogWeight(ctx context.Context, cmd LogWeightMetricCommand) (*WeightLogResult, error)

	// GetWeightHistory returns paginated weight entries for a user, newest first.
	GetWeightHistory(ctx context.Context, userID uint, limit, offset int) ([]WeightLogResult, int64, error)

	// GetHealthSummary returns stored targets from the health profile plus
	// the latest weight entry and 90-day weight history.
	// Returns 404 if onboarding is not done.
	GetHealthSummary(ctx context.Context, userID uint) (*HealthSummaryResult, error)
}

// LogWeightMetricCommand carries validated data for logging a weight entry.
type LogWeightMetricCommand struct {
	UserID          uint
	LoggedAt        time.Time  // user-selected date (YYYY-MM-DD)
	WeightKg        float64
	Note            string
	ClientCreatedAt *time.Time // nil means use server time
}

// WeightLogResult is returned by LogWeight and GetWeightHistory.
type WeightLogResult struct {
	ID          uint
	WeightKg    float64
	LoggedAt    time.Time
	Note        string
	BMI         float64
	BMICategory string
	CreatedAt   time.Time
}

// HealthSummaryResult is returned by GetHealthSummary.
type HealthSummaryResult struct {
	BMI            float64
	BMICategory    string
	BMR            float64
	TDEE           float64
	CalorieTarget  float64
	ProteinTargetG float64
	CarbTargetG    float64
	FatTargetG     float64
	WaterTargetMl  int
	LatestWeight   *WeightPoint
	WeightHistory  []WeightPoint
}

// WeightPoint is a minimal (date, weight) pair used in history charts.
type WeightPoint struct {
	LoggedAt time.Time
	WeightKg float64
}
