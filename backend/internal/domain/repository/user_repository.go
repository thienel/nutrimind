package repository

import (
	"context"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/pkg/query"
)

// UserRepository extends BaseRepository for User entity
type UserRepository interface {
	BaseRepository[entity.User]

	FindByGoogleID(ctx context.Context, googleID string) (*entity.User, error)
	FindByEmail(ctx context.Context, email string) (*entity.User, error)

	// ListWithQuery supports search filter across multiple fields
	ListWithQuery(ctx context.Context, offset, limit int, opts query.QueryOptions) ([]*entity.User, int64, error)
}
