package persistence

import (
	"context"

	"gorm.io/gorm"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/domain/repository"
	"nutrimind-backend/pkg/query"
)

type userDeviceRepositoryImpl struct {
	db *gorm.DB
}

// NewUserDeviceRepository creates a new UserDeviceRepository backed by GORM.
func NewUserDeviceRepository(db *gorm.DB) repository.UserDeviceRepository {
	return &userDeviceRepositoryImpl{db: db}
}

func (r *userDeviceRepositoryImpl) Create(ctx context.Context, e *entity.UserDevice) error {
	if err := r.db.WithContext(ctx).Create(e).Error; err != nil {
		return wrapCreateError(err, "user device")
	}
	return nil
}

func (r *userDeviceRepositoryImpl) FindByID(ctx context.Context, id uint) (*entity.UserDevice, error) {
	var d entity.UserDevice
	if err := r.db.WithContext(ctx).First(&d, id).Error; err != nil {
		return nil, wrapNotFoundError(err, "user device")
	}
	return &d, nil
}

func (r *userDeviceRepositoryImpl) Update(ctx context.Context, e *entity.UserDevice) error {
	if err := r.db.WithContext(ctx).Save(e).Error; err != nil {
		return wrapUpdateError(err, "user device")
	}
	return nil
}

func (r *userDeviceRepositoryImpl) Delete(ctx context.Context, id uint) error {
	if err := r.db.WithContext(ctx).Delete(&entity.UserDevice{}, id).Error; err != nil {
		return wrapDeleteError(err, "user device")
	}
	return nil
}

func (r *userDeviceRepositoryImpl) List(ctx context.Context, offset, limit int, _ query.QueryOptions) ([]entity.UserDevice, int64, error) {
	var devices []entity.UserDevice
	var total int64
	q := r.db.WithContext(ctx).Model(&entity.UserDevice{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, wrapListError(err, "user device")
	}
	if err := q.Offset(offset).Limit(limit).Find(&devices).Error; err != nil {
		return nil, 0, wrapListError(err, "user device")
	}
	return devices, total, nil
}

func (r *userDeviceRepositoryImpl) Exists(ctx context.Context, id uint) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&entity.UserDevice{}).Where("id = ?", id).Count(&count).Error; err != nil {
		return false, wrapListError(err, "user device")
	}
	return count > 0, nil
}

func (r *userDeviceRepositoryImpl) UpsertByUserAndPlatform(ctx context.Context, device *entity.UserDevice) error {
	// Find existing record or build a new one, then save with the latest token.
	var existing entity.UserDevice
	result := r.db.WithContext(ctx).
		Where("user_id = ? AND platform = ?", device.UserID, device.Platform).
		First(&existing)

	if result.Error == nil {
		// Record exists — update token only.
		existing.FCMToken = device.FCMToken
		if err := r.db.WithContext(ctx).Save(&existing).Error; err != nil {
			return wrapUpdateError(err, "user device")
		}
		*device = existing
		return nil
	}

	// Not found — create.
	if err := r.db.WithContext(ctx).Create(device).Error; err != nil {
		return wrapCreateError(err, "user device")
	}
	return nil
}

func (r *userDeviceRepositoryImpl) FindByUserID(ctx context.Context, userID uint) ([]entity.UserDevice, error) {
	var devices []entity.UserDevice
	if err := r.db.WithContext(ctx).Where("user_id = ?", userID).Find(&devices).Error; err != nil {
		return nil, wrapListError(err, "user device")
	}
	return devices, nil
}

var _ repository.UserDeviceRepository = (*userDeviceRepositoryImpl)(nil)
