package repository

import (
	"context"

	"nutrimind-backend/internal/domain/entity"
)

// UserDeviceRepository handles persistence of UserDevice records.
type UserDeviceRepository interface {
	BaseRepository[entity.UserDevice]

	// UpsertByUserAndPlatform creates or updates the FCM token for a given user + platform pair.
	UpsertByUserAndPlatform(ctx context.Context, device *entity.UserDevice) error

	// FindByUserID returns all devices registered for a user.
	FindByUserID(ctx context.Context, userID uint) ([]entity.UserDevice, error)
}
