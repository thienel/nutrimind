package repository

import (
	"context"
	"time"

	"nutrimind-backend/internal/domain/entity"
)

// MealEntryRepository handles persistence of MealEntry records.
type MealEntryRepository interface {
	BaseRepository[entity.MealEntry]

	// FindByUserIDAndDate returns all meal entries for a user on a given date, ordered by created_at ASC.
	FindByUserIDAndDate(ctx context.Context, userID uint, date time.Time) ([]entity.MealEntry, error)
}
