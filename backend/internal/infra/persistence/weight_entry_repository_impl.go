package persistence

import (
	"context"
	"time"

	"gorm.io/gorm"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/domain/repository"
	apperror "nutrimind-backend/pkg/error"
	"nutrimind-backend/pkg/query"
)

type weightEntryRepositoryImpl struct {
	db *gorm.DB
}

// NewWeightEntryRepository creates a new WeightEntryRepository backed by GORM.
func NewWeightEntryRepository(db *gorm.DB) repository.WeightEntryRepository {
	return &weightEntryRepositoryImpl{db: db}
}

// --- BaseRepository Methods ---

func (r *weightEntryRepositoryImpl) Create(ctx context.Context, e *entity.WeightEntry) error {
	if err := r.db.WithContext(ctx).Create(e).Error; err != nil {
		if isDuplicateKeyError(err) {
			return apperror.ErrConflict.WithMessage("Đã có bản ghi cân nặng cho ngày này")
		}
		return wrapCreateError(err, "weight entry")
	}
	return nil
}

func (r *weightEntryRepositoryImpl) FindByID(ctx context.Context, id uint) (*entity.WeightEntry, error) {
	var we entity.WeightEntry
	if err := r.db.WithContext(ctx).First(&we, id).Error; err != nil {
		return nil, wrapNotFoundError(err, "weight entry")
	}
	return &we, nil
}

func (r *weightEntryRepositoryImpl) Update(ctx context.Context, e *entity.WeightEntry) error {
	if err := r.db.WithContext(ctx).Save(e).Error; err != nil {
		return wrapUpdateError(err, "weight entry")
	}
	return nil
}

func (r *weightEntryRepositoryImpl) Delete(ctx context.Context, id uint) error {
	if err := r.db.WithContext(ctx).Delete(&entity.WeightEntry{}, id).Error; err != nil {
		return wrapDeleteError(err, "weight entry")
	}
	return nil
}

func (r *weightEntryRepositoryImpl) List(ctx context.Context, offset, limit int, _ query.QueryOptions) ([]entity.WeightEntry, int64, error) {
	var entries []entity.WeightEntry
	var total int64

	q := r.db.WithContext(ctx).Model(&entity.WeightEntry{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, wrapListError(err, "weight entry")
	}
	if err := q.Order("date DESC").Offset(offset).Limit(limit).Find(&entries).Error; err != nil {
		return nil, 0, wrapListError(err, "weight entry")
	}
	return entries, total, nil
}

func (r *weightEntryRepositoryImpl) Exists(ctx context.Context, id uint) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&entity.WeightEntry{}).Where("id = ?", id).Count(&count).Error; err != nil {
		return false, wrapListError(err, "weight entry")
	}
	return count > 0, nil
}

// --- WeightEntryRepository Methods ---

// FindByUserIDAndDate returns the weight entry for a specific user/date combination.
func (r *weightEntryRepositoryImpl) FindByUserIDAndDate(ctx context.Context, userID uint, date time.Time) (*entity.WeightEntry, error) {
	var we entity.WeightEntry
	dateOnly := date.Truncate(24 * time.Hour)
	if err := r.db.WithContext(ctx).
		Where("user_id = ? AND logged_at = ?", userID, dateOnly).
		First(&we).Error; err != nil {
		return nil, wrapNotFoundError(err, "weight entry")
	}
	return &we, nil
}

// FindLatestByUserID returns the most recent weight entry for a user.
func (r *weightEntryRepositoryImpl) FindLatestByUserID(ctx context.Context, userID uint) (*entity.WeightEntry, error) {
	var we entity.WeightEntry
	if err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("logged_at DESC").
		First(&we).Error; err != nil {
		return nil, wrapNotFoundError(err, "weight entry")
	}
	return &we, nil
}

// ListByUserID returns paginated weight entries for a user, ordered by logged_at DESC.
func (r *weightEntryRepositoryImpl) ListByUserID(ctx context.Context, userID uint, offset, limit int) ([]entity.WeightEntry, int64, error) {
	var entries []entity.WeightEntry
	var total int64

	q := r.db.WithContext(ctx).Model(&entity.WeightEntry{}).Where("user_id = ?", userID)

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, wrapListError(err, "weight entry")
	}
	if err := q.Order("logged_at DESC").Offset(offset).Limit(limit).Find(&entries).Error; err != nil {
		return nil, 0, wrapListError(err, "weight entry")
	}
	return entries, total, nil
}

// ListByUserIDInDateRange returns all weight entries within [from, to] for a user, newest first.
func (r *weightEntryRepositoryImpl) ListByUserIDInDateRange(ctx context.Context, userID uint, from, to time.Time) ([]entity.WeightEntry, error) {
	var entries []entity.WeightEntry
	if err := r.db.WithContext(ctx).
		Where("user_id = ? AND logged_at >= ? AND logged_at <= ?", userID, from, to).
		Order("logged_at DESC").
		Find(&entries).Error; err != nil {
		return nil, wrapListError(err, "weight entry")
	}
	return entries, nil
}

// ensure compile-time interface satisfaction
var _ repository.WeightEntryRepository = (*weightEntryRepositoryImpl)(nil)
