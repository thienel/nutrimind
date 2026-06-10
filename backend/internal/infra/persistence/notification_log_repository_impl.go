package persistence

import (
	"context"
	"time"

	"gorm.io/gorm"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/domain/repository"
	"nutrimind-backend/pkg/query"
)

type notificationLogRepositoryImpl struct {
	db *gorm.DB
}

// NewNotificationLogRepository creates a new NotificationLogRepository backed by GORM.
func NewNotificationLogRepository(db *gorm.DB) repository.NotificationLogRepository {
	return &notificationLogRepositoryImpl{db: db}
}

func (r *notificationLogRepositoryImpl) Create(ctx context.Context, e *entity.NotificationLog) error {
	if err := r.db.WithContext(ctx).Create(e).Error; err != nil {
		return wrapCreateError(err, "notification log")
	}
	return nil
}

func (r *notificationLogRepositoryImpl) FindByID(ctx context.Context, id uint) (*entity.NotificationLog, error) {
	var n entity.NotificationLog
	if err := r.db.WithContext(ctx).First(&n, id).Error; err != nil {
		return nil, wrapNotFoundError(err, "notification log")
	}
	return &n, nil
}

func (r *notificationLogRepositoryImpl) Update(ctx context.Context, e *entity.NotificationLog) error {
	if err := r.db.WithContext(ctx).Save(e).Error; err != nil {
		return wrapUpdateError(err, "notification log")
	}
	return nil
}

func (r *notificationLogRepositoryImpl) Delete(ctx context.Context, id uint) error {
	if err := r.db.WithContext(ctx).Delete(&entity.NotificationLog{}, id).Error; err != nil {
		return wrapDeleteError(err, "notification log")
	}
	return nil
}

func (r *notificationLogRepositoryImpl) List(ctx context.Context, offset, limit int, _ query.QueryOptions) ([]entity.NotificationLog, int64, error) {
	var logs []entity.NotificationLog
	var total int64
	q := r.db.WithContext(ctx).Model(&entity.NotificationLog{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, wrapListError(err, "notification log")
	}
	if err := q.Order("created_at DESC").Offset(offset).Limit(limit).Find(&logs).Error; err != nil {
		return nil, 0, wrapListError(err, "notification log")
	}
	return logs, total, nil
}

func (r *notificationLogRepositoryImpl) Exists(ctx context.Context, id uint) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&entity.NotificationLog{}).Where("id = ?", id).Count(&count).Error; err != nil {
		return false, wrapListError(err, "notification log")
	}
	return count > 0, nil
}

func (r *notificationLogRepositoryImpl) ListByUserID(ctx context.Context, userID uint, offset, limit int) ([]entity.NotificationLog, int64, error) {
	var logs []entity.NotificationLog
	var total int64
	q := r.db.WithContext(ctx).Model(&entity.NotificationLog{}).Where("user_id = ?", userID)
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, wrapListError(err, "notification log")
	}
	if err := q.Order("created_at DESC").Offset(offset).Limit(limit).Find(&logs).Error; err != nil {
		return nil, 0, wrapListError(err, "notification log")
	}
	return logs, total, nil
}

func (r *notificationLogRepositoryImpl) CountByUserID(ctx context.Context, userID uint) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&entity.NotificationLog{}).Where("user_id = ?", userID).Count(&count).Error; err != nil {
		return 0, wrapListError(err, "notification log")
	}
	return count, nil
}

func (r *notificationLogRepositoryImpl) DeleteOldestByUserID(ctx context.Context, userID uint) error {
	// Subquery: find the ID of the oldest log for the user.
	subQuery := r.db.WithContext(ctx).
		Model(&entity.NotificationLog{}).
		Select("id").
		Where("user_id = ?", userID).
		Order("created_at ASC").
		Limit(1)

	if err := r.db.WithContext(ctx).
		Where("id = (?)", subQuery).
		Delete(&entity.NotificationLog{}).Error; err != nil {
		return wrapDeleteError(err, "notification log")
	}
	return nil
}

// FindPendingRetries returns queued notifications where at least 5 minutes have elapsed
// since their last retry attempt and retry_count < maxRetries.
func (r *notificationLogRepositoryImpl) FindPendingRetries(ctx context.Context, maxRetries int) ([]entity.NotificationLog, error) {
	cutoff := time.Now().UTC().Add(-5 * time.Minute)
	var logs []entity.NotificationLog
	if err := r.db.WithContext(ctx).
		Where("status = ? AND retry_count < ? AND created_at <= ?",
			entity.NotificationStatusQueued, maxRetries, cutoff).
		Find(&logs).Error; err != nil {
		return nil, wrapListError(err, "notification log")
	}
	return logs, nil
}

func (r *notificationLogRepositoryImpl) UpdateStatus(ctx context.Context, id uint, status string, retryCount int) error {
	updates := map[string]any{
		"status":      status,
		"retry_count": retryCount,
	}
	if status == entity.NotificationStatusDelivered {
		now := time.Now().UTC()
		updates["sent_at"] = now
	}
	if err := r.db.WithContext(ctx).Model(&entity.NotificationLog{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return wrapUpdateError(err, "notification log")
	}
	return nil
}

var _ repository.NotificationLogRepository = (*notificationLogRepositoryImpl)(nil)
