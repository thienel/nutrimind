package repository

import (
	"context"
	"time"

	"nutrimind-backend/internal/domain/entity"
)

// WeightEntryRepository handles persistence of WeightEntry records.
// The composite unique index (user_id, date) is enforced at the database level.
type WeightEntryRepository interface {
	BaseRepository[entity.WeightEntry]

	// FindByUserIDAndDate returns the weight entry for a specific user and date.
	// Returns ErrNotFound if none exists.
	FindByUserIDAndDate(ctx context.Context, userID uint, date time.Time) (*entity.WeightEntry, error)

	// ListByUserID returns all weight entries for a user ordered by date descending.
	ListByUserID(ctx context.Context, userID uint, offset, limit int) ([]entity.WeightEntry, int64, error)
}
