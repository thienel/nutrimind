package repository

import (
	"context"
	"time"

	"nutrimind-backend/internal/domain/entity"
)

// WaterDailySummary holds aggregated water intake for a single day.
type WaterDailySummary struct {
	LoggedDate time.Time
	TotalMl    int
}

// WaterEntryRepository handles persistence of WaterEntry records.
type WaterEntryRepository interface {
	BaseRepository[entity.WaterEntry]

	// FindByUserIDAndDate returns all water entries for a user on a given date, ordered by created_at ASC.
	FindByUserIDAndDate(ctx context.Context, userID uint, date time.Time) ([]entity.WaterEntry, error)

	// SumByUserIDAndDate returns the total volume_ml for a user on a given date.
	SumByUserIDAndDate(ctx context.Context, userID uint, date time.Time) (int, error)

	// ListDailySummaryByDateRange returns aggregated daily totals for each date in [from, to].
	// Only dates that have at least one entry are returned — caller fills in zeros for missing dates.
	ListDailySummaryByDateRange(ctx context.Context, userID uint, from, to time.Time) ([]WaterDailySummary, error)
}
