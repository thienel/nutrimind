package repository

import (
	"context"
	"time"

	"nutrimind-backend/internal/domain/entity"
)

// MealDailySummary holds aggregated calorie data for a single day.
type MealDailySummary struct {
	LoggedDate    time.Time
	TotalCalories float64
}

// MealDailyMacros holds the total macros logged for a single day.
type MealDailyMacros struct {
	TotalCalories float64
	TotalProteinG float64
	TotalCarbG    float64
	TotalFatG     float64
}

// MealEntryRepository handles persistence of MealEntry records.
type MealEntryRepository interface {
	BaseRepository[entity.MealEntry]

	// FindByUserIDAndDate returns all meal entries for a user on a given date, ordered by created_at ASC.
	FindByUserIDAndDate(ctx context.Context, userID uint, date time.Time) ([]entity.MealEntry, error)

	// SumMacrosByUserIDAndDate returns total macros for a user on a given date.
	SumMacrosByUserIDAndDate(ctx context.Context, userID uint, date time.Time) (MealDailyMacros, error)

	// ListDailySummaryByDateRange returns aggregated daily calorie totals for [from, to].
	// Only dates with at least one entry are returned.
	ListDailySummaryByDateRange(ctx context.Context, userID uint, from, to time.Time) ([]MealDailySummary, error)
}
