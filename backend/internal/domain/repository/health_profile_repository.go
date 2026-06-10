package repository

import (
	"context"

	"nutrimind-backend/internal/domain/entity"
)

// HealthProfileRepository extends BaseRepository for HealthProfile entity.
// Each user can have at most one health profile (1-1 relationship).
type HealthProfileRepository interface {
	BaseRepository[entity.HealthProfile]

	// FindByUserID returns the health profile belonging to the given user.
	FindByUserID(ctx context.Context, userID uint) (*entity.HealthProfile, error)

	// FindByUserIDs returns health profiles for multiple users.
	FindByUserIDs(ctx context.Context, userIDs []uint) ([]entity.HealthProfile, error)
}
