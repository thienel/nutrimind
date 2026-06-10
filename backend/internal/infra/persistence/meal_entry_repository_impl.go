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

func (r *mealEntryRepositoryImpl) SumMacrosByUserIDAndDate(ctx context.Context, userID uint, date time.Time) (repository.MealDailyMacros, error) {
	type row struct {
		TotalCalories float64
		TotalProteinG float64
		TotalCarbG    float64
		TotalFatG     float64
	}
	var result row
	err := r.db.WithContext(ctx).
		Model(&entity.MealEntry{}).
		Select("COALESCE(SUM(calories), 0) AS total_calories, COALESCE(SUM(protein_g), 0) AS total_protein_g, COALESCE(SUM(carb_g), 0) AS total_carb_g, COALESCE(SUM(fat_g), 0) AS total_fat_g").
		Where("user_id = ? AND logged_date = ?", userID, date.Truncate(24*time.Hour)).
		Scan(&result).Error
	if err != nil {
		return repository.MealDailyMacros{}, wrapListError(err, "meal entry")
	}
	return repository.MealDailyMacros{
		TotalCalories: result.TotalCalories,
		TotalProteinG: result.TotalProteinG,
		TotalCarbG:    result.TotalCarbG,
		TotalFatG:     result.TotalFatG,
	}, nil
}

func (r *mealEntryRepositoryImpl) ListDailySummaryByDateRange(ctx context.Context, userID uint, from, to time.Time) ([]repository.MealDailySummary, error) {
	type row struct {
		LoggedDate    time.Time
		TotalCalories float64
	}
	var rows []row
	err := r.db.WithContext(ctx).
		Model(&entity.MealEntry{}).
		Select("logged_date, COALESCE(SUM(calories), 0) AS total_calories").
		Where("user_id = ? AND logged_date BETWEEN ? AND ?", userID, from.Truncate(24*time.Hour), to.Truncate(24*time.Hour)).
		Group("logged_date").
		Order("logged_date ASC").
		Scan(&rows).Error
	if err != nil {
		return nil, wrapListError(err, "meal entry")
	}
	summaries := make([]repository.MealDailySummary, 0, len(rows))
	for _, r := range rows {
		summaries = append(summaries, repository.MealDailySummary{
			LoggedDate:    r.LoggedDate,
			TotalCalories: r.TotalCalories,
		})
	}
	return summaries, nil
}

// ensure compile-time interface satisfaction
var _ repository.MealEntryRepository = (*mealEntryRepositoryImpl)(nil)
