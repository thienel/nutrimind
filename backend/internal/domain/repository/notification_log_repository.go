package repository

import (
	"context"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/pkg/query"
)

// NotificationLogRepository handles persistence of NotificationLog records.
type NotificationLogRepository interface {
	BaseRepository[entity.NotificationLog]

	// ListByUserID returns paginated notification logs for a user, newest first.
	ListByUserID(ctx context.Context, userID uint, offset, limit int) ([]entity.NotificationLog, int64, error)

	// CountByUserID returns the total number of notification logs for a user.
	CountByUserID(ctx context.Context, userID uint) (int64, error)

	// DeleteOldestByUserID deletes the single oldest notification log for a user.
	DeleteOldestByUserID(ctx context.Context, userID uint) error

	// FindPendingRetries returns queued notifications whose retry is due.
	FindPendingRetries(ctx context.Context, maxRetries int) ([]entity.NotificationLog, error)

	// UpdateStatus updates status, sent_at, and retry_count for a notification log.
	UpdateStatus(ctx context.Context, id uint, status string, retryCount int) error
}

// ListNotificationsOptions is used to satisfy the BaseRepository.List signature.
type ListNotificationsOptions = query.QueryOptions
