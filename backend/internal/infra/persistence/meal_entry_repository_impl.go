package persistence

import (
	"context"
	"time"

	"gorm.io/gorm"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/domain/repository"
	"nutrimind-backend/pkg/query"
)

type mealEntryRepositoryImpl struct {
	db *gorm.DB
}

// NewMealEntryRepository creates a new MealEntryRepository backed by GORM.
func NewMealEntryRepository(db *gorm.DB) repository.MealEntryRepository {
	return &mealEntryRepositoryImpl{db: db}
}

func (r *mealEntryRepositoryImpl) Create(ctx context.Context, e *entity.MealEntry) error {
	if err := r.db.WithContext(ctx).Create(e).Error; err != nil {
		return wrapCreateError(err, "meal entry")
	}
	return nil
}

func (r *mealEntryRepositoryImpl) FindByID(ctx context.Context, id uint) (*entity.MealEntry, error) {
	var me entity.MealEntry
	if err := r.db.WithContext(ctx).First(&me, id).Error; err != nil {
		return nil, wrapNotFoundError(err, "meal entry")
	}
	return &me, nil
}

func (r *mealEntryRepositoryImpl) Update(ctx context.Context, e *entity.MealEntry) error {
	if err := r.db.WithContext(ctx).Save(e).Error; err != nil {
		return wrapUpdateError(err, "meal entry")
	}
	return nil
}

func (r *mealEntryRepositoryImpl) Delete(ctx context.Context, id uint) error {
	if err := r.db.WithContext(ctx).Delete(&entity.MealEntry{}, id).Error; err != nil {
		return wrapDeleteError(err, "meal entry")
	}
	return nil
}

func (r *mealEntryRepositoryImpl) List(ctx context.Context, offset, limit int, _ query.QueryOptions) ([]entity.MealEntry, int64, error) {
	var entries []entity.MealEntry
	var total int64

	q := r.db.WithContext(ctx).Model(&entity.MealEntry{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, wrapListError(err, "meal entry")
	}
	if err := q.Order("logged_date DESC, created_at DESC").Offset(offset).Limit(limit).Find(&entries).Error; err != nil {
		return nil, 0, wrapListError(err, "meal entry")
	}
	return entries, total, nil
}

func (r *mealEntryRepositoryImpl) Exists(ctx context.Context, id uint) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&entity.MealEntry{}).Where("id = ?", id).Count(&count).Error; err != nil {
		return false, wrapListError(err, "meal entry")
	}
	return count > 0, nil
}

// FindByUserIDAndDate returns all meal entries for a user on a given date, ordered by created_at ASC.
func (r *mealEntryRepositoryImpl) FindByUserIDAndDate(ctx context.Context, userID uint, date time.Time) ([]entity.MealEntry, error) {
	var entries []entity.MealEntry
	dateOnly := date.Truncate(24 * time.Hour)
	if err := r.db.WithContext(ctx).
		Where("user_id = ? AND logged_date = ?", userID, dateOnly).
		Order("created_at ASC").
		Find(&entries).Error; err != nil {
		return nil, wrapListError(err, "meal entry")
	}
	return entries, nil
}

// ensure compile-time interface satisfaction
var _ repository.MealEntryRepository = (*mealEntryRepositoryImpl)(nil)
