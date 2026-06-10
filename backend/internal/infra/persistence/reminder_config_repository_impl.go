package persistence

import (
	"context"

	"gorm.io/gorm"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/domain/repository"
	"nutrimind-backend/pkg/query"
)

type reminderConfigRepositoryImpl struct {
	db *gorm.DB
}

// NewReminderConfigRepository creates a new ReminderConfigRepository backed by GORM.
func NewReminderConfigRepository(db *gorm.DB) repository.ReminderConfigRepository {
	return &reminderConfigRepositoryImpl{db: db}
}

func (r *reminderConfigRepositoryImpl) Create(ctx context.Context, e *entity.ReminderConfig) error {
	if err := r.db.WithContext(ctx).Create(e).Error; err != nil {
		return wrapCreateError(err, "reminder config")
	}
	return nil
}

func (r *reminderConfigRepositoryImpl) FindByID(ctx context.Context, id uint) (*entity.ReminderConfig, error) {
	var rc entity.ReminderConfig
	if err := r.db.WithContext(ctx).First(&rc, id).Error; err != nil {
		return nil, wrapNotFoundError(err, "reminder config")
	}
	return &rc, nil
}

func (r *reminderConfigRepositoryImpl) Update(ctx context.Context, e *entity.ReminderConfig) error {
	if err := r.db.WithContext(ctx).Save(e).Error; err != nil {
		return wrapUpdateError(err, "reminder config")
	}
	return nil
}

func (r *reminderConfigRepositoryImpl) Delete(ctx context.Context, id uint) error {
	if err := r.db.WithContext(ctx).Delete(&entity.ReminderConfig{}, id).Error; err != nil {
		return wrapDeleteError(err, "reminder config")
	}
	return nil
}

func (r *reminderConfigRepositoryImpl) List(ctx context.Context, offset, limit int, _ query.QueryOptions) ([]entity.ReminderConfig, int64, error) {
	var configs []entity.ReminderConfig
	var total int64
	q := r.db.WithContext(ctx).Model(&entity.ReminderConfig{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, wrapListError(err, "reminder config")
	}
	if err := q.Offset(offset).Limit(limit).Find(&configs).Error; err != nil {
		return nil, 0, wrapListError(err, "reminder config")
	}
	return configs, total, nil
}

func (r *reminderConfigRepositoryImpl) Exists(ctx context.Context, id uint) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&entity.ReminderConfig{}).Where("id = ?", id).Count(&count).Error; err != nil {
		return false, wrapListError(err, "reminder config")
	}
	return count > 0, nil
}

func (r *reminderConfigRepositoryImpl) UpsertByUserAndType(ctx context.Context, config *entity.ReminderConfig) error {
	var existing entity.ReminderConfig
	result := r.db.WithContext(ctx).
		Where("user_id = ? AND reminder_type = ?", config.UserID, config.ReminderType).
		First(&existing)

	if result.Error == nil {
		// Record exists — update all mutable fields.
		existing.Enabled = config.Enabled
		existing.FrequencyMin = config.FrequencyMin
		existing.SpecificTimes = config.SpecificTimes
		existing.WindowStart = config.WindowStart
		existing.WindowEnd = config.WindowEnd
		existing.CustomMessage = config.CustomMessage
		if err := r.db.WithContext(ctx).Save(&existing).Error; err != nil {
			return wrapUpdateError(err, "reminder config")
		}
		*config = existing
		return nil
	}

	if err := r.db.WithContext(ctx).Create(config).Error; err != nil {
		return wrapCreateError(err, "reminder config")
	}
	return nil
}

func (r *reminderConfigRepositoryImpl) FindByUserID(ctx context.Context, userID uint) ([]entity.ReminderConfig, error) {
	var configs []entity.ReminderConfig
	if err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("reminder_type ASC").
		Find(&configs).Error; err != nil {
		return nil, wrapListError(err, "reminder config")
	}
	return configs, nil
}

func (r *reminderConfigRepositoryImpl) FindAllEnabled(ctx context.Context) ([]entity.ReminderConfig, error) {
	var configs []entity.ReminderConfig
	if err := r.db.WithContext(ctx).Where("enabled = true").Find(&configs).Error; err != nil {
		return nil, wrapListError(err, "reminder config")
	}
	return configs, nil
}

var _ repository.ReminderConfigRepository = (*reminderConfigRepositoryImpl)(nil)
