package repository

import (
	"context"

	"nutrimind-backend/pkg/query"
)

// BaseRepository is a generic repository interface
type BaseRepository[T any] interface {
	Create(ctx context.Context, entity *T) error
	FindByID(ctx context.Context, id uint) (*T, error)
	Update(ctx context.Context, entity *T) error
	Delete(ctx context.Context, id uint) error
	List(ctx context.Context, offset, limit int, opts query.QueryOptions) ([]T, int64, error)
	Exists(ctx context.Context, id uint) (bool, error)
}
