package repository

import (
	"context"

	"nutrimind-backend/internal/domain/entity"
)

// ReminderConfigRepository handles persistence of ReminderConfig records.
type ReminderConfigRepository interface {
	BaseRepository[entity.ReminderConfig]

	// UpsertByUserAndType creates or updates the reminder config for a given user + type pair.
	UpsertByUserAndType(ctx context.Context, config *entity.ReminderConfig) error

	// FindByUserID returns all reminder configs for a user.
	FindByUserID(ctx context.Context, userID uint) ([]entity.ReminderConfig, error)

	// FindAllEnabled returns all reminder configs with enabled=true (used by scheduler).
	FindAllEnabled(ctx context.Context) ([]entity.ReminderConfig, error)
}
