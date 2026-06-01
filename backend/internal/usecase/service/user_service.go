package service

import (
	"context"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/pkg/query"
)

// UserService defines user management service interface
type UserService interface {
	GetByID(ctx context.Context, id uint) (*entity.User, error)
	Update(ctx context.Context, cmd UpdateUserCommand) (*entity.User, error)
	Delete(ctx context.Context, id uint) error
	List(ctx context.Context, offset, limit int, opts query.QueryOptions) ([]*entity.User, int64, error)
}

// UpdateUserCommand represents user update input
type UpdateUserCommand struct {
	ID     uint
	Role   string
	Status string
}
