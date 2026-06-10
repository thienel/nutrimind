package persistence

import (
	"context"

	"gorm.io/gorm"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/domain/repository"
	"nutrimind-backend/pkg/query"
)

type friendshipRepositoryImpl struct {
	db *gorm.DB
}

func NewFriendshipRepository(db *gorm.DB) repository.FriendshipRepository {
	return &friendshipRepositoryImpl{db: db}
}

func (r *friendshipRepositoryImpl) Create(ctx context.Context, e *entity.Friendship) error {
	if err := r.db.WithContext(ctx).Create(e).Error; err != nil {
		return wrapCreateError(err, "friendship")
	}
	return nil
}

func (r *friendshipRepositoryImpl) FindByID(ctx context.Context, id uint) (*entity.Friendship, error) {
	var f entity.Friendship
	if err := r.db.WithContext(ctx).First(&f, id).Error; err != nil {
		return nil, wrapNotFoundError(err, "friendship")
	}
	return &f, nil
}

func (r *friendshipRepositoryImpl) Update(ctx context.Context, e *entity.Friendship) error {
	if err := r.db.WithContext(ctx).Save(e).Error; err != nil {
		return wrapUpdateError(err, "friendship")
	}
	return nil
}

func (r *friendshipRepositoryImpl) Delete(ctx context.Context, id uint) error {
	if err := r.db.WithContext(ctx).Delete(&entity.Friendship{}, id).Error; err != nil {
		return wrapDeleteError(err, "friendship")
	}
	return nil
}

func (r *friendshipRepositoryImpl) List(ctx context.Context, offset, limit int, _ query.QueryOptions) ([]entity.Friendship, int64, error) {
	var fs []entity.Friendship
	var total int64
	q := r.db.WithContext(ctx).Model(&entity.Friendship{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, wrapListError(err, "friendship")
	}
	if err := q.Offset(offset).Limit(limit).Find(&fs).Error; err != nil {
		return nil, 0, wrapListError(err, "friendship")
	}
	return fs, total, nil
}

func (r *friendshipRepositoryImpl) Exists(ctx context.Context, id uint) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&entity.Friendship{}).Where("id = ?", id).Count(&count).Error; err != nil {
		return false, wrapListError(err, "friendship")
	}
	return count > 0, nil
}

func (r *friendshipRepositoryImpl) FindAnyBetween(ctx context.Context, userA, userB uint) (*entity.Friendship, error) {
	var f entity.Friendship
	err := r.db.WithContext(ctx).
		Where("(requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)",
			userA, userB, userB, userA).
		First(&f).Error
	if err != nil {
		return nil, wrapNotFoundError(err, "friendship")
	}
	return &f, nil
}

func (r *friendshipRepositoryImpl) FindAcceptedByUserID(ctx context.Context, userID uint) ([]entity.Friendship, error) {
	var fs []entity.Friendship
	if err := r.db.WithContext(ctx).
		Where("status = ? AND (requester_id = ? OR addressee_id = ?)",
			entity.FriendshipStatusAccepted, userID, userID).
		Find(&fs).Error; err != nil {
		return nil, wrapListError(err, "friendship")
	}
	return fs, nil
}

func (r *friendshipRepositoryImpl) FindPendingReceivedByUserID(ctx context.Context, userID uint) ([]entity.Friendship, error) {
	var fs []entity.Friendship
	if err := r.db.WithContext(ctx).
		Where("status = ? AND addressee_id = ?", entity.FriendshipStatusPending, userID).
		Find(&fs).Error; err != nil {
		return nil, wrapListError(err, "friendship")
	}
	return fs, nil
}

var _ repository.FriendshipRepository = (*friendshipRepositoryImpl)(nil)
