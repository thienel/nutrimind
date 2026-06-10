package persistence

import (
	"context"
	"time"

	"gorm.io/gorm"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/domain/repository"
	"nutrimind-backend/pkg/query"
)

type waterEntryRepositoryImpl struct {
	db *gorm.DB
}

// NewWaterEntryRepository creates a new WaterEntryRepository backed by GORM.
func NewWaterEntryRepository(db *gorm.DB) repository.WaterEntryRepository {
	return &waterEntryRepositoryImpl{db: db}
}

func (r *waterEntryRepositoryImpl) Create(ctx context.Context, e *entity.WaterEntry) error {
	if err := r.db.WithContext(ctx).Create(e).Error; err != nil {
		return wrapCreateError(err, "water entry")
	}
	return nil
}

func (r *waterEntryRepositoryImpl) FindByID(ctx context.Context, id uint) (*entity.WaterEntry, error) {
	var we entity.WaterEntry
	if err := r.db.WithContext(ctx).First(&we, id).Error; err != nil {
		return nil, wrapNotFoundError(err, "water entry")
	}
	return &we, nil
}

func (r *waterEntryRepositoryImpl) Update(ctx context.Context, e *entity.WaterEntry) error {
	if err := r.db.WithContext(ctx).Save(e).Error; err != nil {
		return wrapUpdateError(err, "water entry")
	}
	return nil
}

func (r *waterEntryRepositoryImpl) Delete(ctx context.Context, id uint) error {
	if err := r.db.WithContext(ctx).Delete(&entity.WaterEntry{}, id).Error; err != nil {
		return wrapDeleteError(err, "water entry")
	}
	return nil
}

func (r *waterEntryRepositoryImpl) List(ctx context.Context, offset, limit int, _ query.QueryOptions) ([]entity.WaterEntry, int64, error) {
	var entries []entity.WaterEntry
	var total int64

	q := r.db.WithContext(ctx).Model(&entity.WaterEntry{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, wrapListError(err, "water entry")
	}
	if err := q.Order("logged_date DESC, created_at DESC").Offset(offset).Limit(limit).Find(&entries).Error; err != nil {
		return nil, 0, wrapListError(err, "water entry")
	}
	return entries, total, nil
}

func (r *waterEntryRepositoryImpl) Exists(ctx context.Context, id uint) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&entity.WaterEntry{}).Where("id = ?", id).Count(&count).Error; err != nil {
		return false, wrapListError(err, "water entry")
	}
	return count > 0, nil
}

func (r *waterEntryRepositoryImpl) FindByUserIDAndDate(ctx context.Context, userID uint, date time.Time) ([]entity.WaterEntry, error) {
	var entries []entity.WaterEntry
	if err := r.db.WithContext(ctx).
		Where("user_id = ? AND logged_date = ?", userID, date.Truncate(24*time.Hour)).
		Order("created_at ASC").
		Find(&entries).Error; err != nil {
		return nil, wrapListError(err, "water entry")
	}
	return entries, nil
}

func (r *waterEntryRepositoryImpl) SumByUserIDAndDate(ctx context.Context, userID uint, date time.Time) (int, error) {
	var total int
	err := r.db.WithContext(ctx).
		Model(&entity.WaterEntry{}).
		Select("COALESCE(SUM(volume_ml), 0)").
		Where("user_id = ? AND logged_date = ?", userID, date.Truncate(24*time.Hour)).
		Scan(&total).Error
	if err != nil {
		return 0, wrapListError(err, "water entry")
	}
	return total, nil
}

func (r *waterEntryRepositoryImpl) ListDailySummaryByDateRange(ctx context.Context, userID uint, from, to time.Time) ([]repository.WaterDailySummary, error) {
	type row struct {
		LoggedDate time.Time
		TotalMl    int
	}
	var rows []row
	err := r.db.WithContext(ctx).
		Model(&entity.WaterEntry{}).
		Select("logged_date, COALESCE(SUM(volume_ml), 0) AS total_ml").
		Where("user_id = ? AND logged_date BETWEEN ? AND ?", userID, from.Truncate(24*time.Hour), to.Truncate(24*time.Hour)).
		Group("logged_date").
		Order("logged_date ASC").
		Scan(&rows).Error
	if err != nil {
		return nil, wrapListError(err, "water entry")
	}

	summaries := make([]repository.WaterDailySummary, 0, len(rows))
	for _, r := range rows {
		summaries = append(summaries, repository.WaterDailySummary{
			LoggedDate: r.LoggedDate,
			TotalMl:    r.TotalMl,
		})
	}
	return summaries, nil
}

// ensure compile-time interface satisfaction
var _ repository.WaterEntryRepository = (*waterEntryRepositoryImpl)(nil)
