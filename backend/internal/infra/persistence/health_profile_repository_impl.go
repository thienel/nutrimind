package persistence

import (
	"context"

	"gorm.io/gorm"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/domain/repository"
	apperror "nutrimind-backend/pkg/error"
	"nutrimind-backend/pkg/query"
)

type healthProfileRepositoryImpl struct {
	db *gorm.DB
}

// NewHealthProfileRepository creates a new health profile repository.
func NewHealthProfileRepository(db *gorm.DB) repository.HealthProfileRepository {
	return &healthProfileRepositoryImpl{db: db}
}

// --- BaseRepository Methods ---

func (r *healthProfileRepositoryImpl) Create(ctx context.Context, e *entity.HealthProfile) error {
	if err := r.db.WithContext(ctx).Create(e).Error; err != nil {
		if isDuplicateKeyError(err) {
			return apperror.ErrConflict.WithMessage("Người dùng đã có health profile")
		}
		return wrapCreateError(err, "health profile")
	}
	return nil
}

func (r *healthProfileRepositoryImpl) FindByID(ctx context.Context, id uint) (*entity.HealthProfile, error) {
	var hp entity.HealthProfile
	if err := r.db.WithContext(ctx).First(&hp, id).Error; err != nil {
		return nil, wrapNotFoundError(err, "health profile")
	}
	return &hp, nil
}

func (r *healthProfileRepositoryImpl) Update(ctx context.Context, e *entity.HealthProfile) error {
	if err := r.db.WithContext(ctx).Save(e).Error; err != nil {
		return wrapUpdateError(err, "health profile")
	}
	return nil
}

func (r *healthProfileRepositoryImpl) Delete(ctx context.Context, id uint) error {
	if err := r.db.WithContext(ctx).Delete(&entity.HealthProfile{}, id).Error; err != nil {
		return wrapDeleteError(err, "health profile")
	}
	return nil
}

func (r *healthProfileRepositoryImpl) List(ctx context.Context, offset, limit int, opts query.QueryOptions) ([]entity.HealthProfile, int64, error) {
	var profiles []entity.HealthProfile
	var total int64

	q := r.db.WithContext(ctx).Model(&entity.HealthProfile{})

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, wrapListError(err, "health profile")
	}
	if err := q.Offset(offset).Limit(limit).Find(&profiles).Error; err != nil {
		return nil, 0, wrapListError(err, "health profile")
	}
	return profiles, total, nil
}

func (r *healthProfileRepositoryImpl) Exists(ctx context.Context, id uint) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&entity.HealthProfile{}).Where("id = ?", id).Count(&count).Error; err != nil {
		return false, wrapListError(err, "health profile")
	}
	return count > 0, nil
}

// --- HealthProfileRepository Methods ---

// FindByUserID returns the health profile for a given user ID.
func (r *healthProfileRepositoryImpl) FindByUserID(ctx context.Context, userID uint) (*entity.HealthProfile, error) {
	var hp entity.HealthProfile
	if err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&hp).Error; err != nil {
		return nil, wrapNotFoundError(err, "health profile")
	}
	return &hp, nil
}

func (r *healthProfileRepositoryImpl) FindByUserIDs(ctx context.Context, userIDs []uint) ([]entity.HealthProfile, error) {
	if len(userIDs) == 0 {
		return nil, nil
	}
	var profiles []entity.HealthProfile
	if err := r.db.WithContext(ctx).Where("user_id IN ?", userIDs).Find(&profiles).Error; err != nil {
		return nil, wrapListError(err, "health profile")
	}
	return profiles, nil
}

var _ repository.HealthProfileRepository = (*healthProfileRepositoryImpl)(nil)
