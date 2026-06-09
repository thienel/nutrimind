package service

import (
	"context"
	"time"

	"nutrimind-backend/internal/domain/entity"
)

// WeightEntryService defines use-cases for tracking body weight over time.
type WeightEntryService interface {
	// LogWeight saves (or overwrites) a weight entry for the given date.
	// Validation: weight must be in [15, 300] kg.
	// If an entry already exists for that day it is overwritten (upsert semantics).
	LogWeight(ctx context.Context, cmd LogWeightCommand) (*entity.WeightEntry, error)

	// GetWeightHistory returns paginated weight entries for a user, newest first.
	GetWeightHistory(ctx context.Context, userID uint, page, pageSize int) ([]entity.WeightEntry, int64, error)

	// GetWeightByDate returns the entry for a specific date, or ErrNotFound.
	GetWeightByDate(ctx context.Context, userID uint, date time.Time) (*entity.WeightEntry, error)

	// DeleteWeightEntry removes a weight entry. Returns ErrForbidden if the entry
	// does not belong to the requesting user.
	DeleteWeightEntry(ctx context.Context, userID uint, entryID uint) error
}

// LogWeightCommand carries the data needed to record a weight measurement.
type LogWeightCommand struct {
	UserID   uint
	Date     time.Time // will be truncated to YYYY-MM-DD
	WeightKg float64
	Note     string
}
