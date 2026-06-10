package repository

import (
	"context"
	"time"

	"nutrimind-backend/internal/domain/entity"
)

// WeightEntryRepository handles persistence of WeightEntry records.
// The composite unique index (user_id, logged_at) is enforced at the database level.
type WeightEntryRepository interface {
	BaseRepository[entity.WeightEntry]

	// FindByUserIDAndDate returns the weight entry for a specific user and date.
	// Returns ErrNotFound if none exists.
	FindByUserIDAndDate(ctx context.Context, userID uint, date time.Time) (*entity.WeightEntry, error)

	// FindLatestByUserID returns the most recent weight entry for a user.
	FindLatestByUserID(ctx context.Context, userID uint) (*entity.WeightEntry, error)

	// ListByUserID returns paginated weight entries for a user ordered by logged_at descending.
	ListByUserID(ctx context.Context, userID uint, offset, limit int) ([]entity.WeightEntry, int64, error)

	// ListByUserIDInDateRange returns all weight entries within [from, to] for a user, newest first.
	ListByUserIDInDateRange(ctx context.Context, userID uint, from, to time.Time) ([]entity.WeightEntry, error)
}
