package persistence

import (
	"context"
	"time"

	"gorm.io/gorm"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/domain/repository"
	"nutrimind-backend/pkg/query"
)

type cheerReactionRepositoryImpl struct {
	db *gorm.DB
}

func NewCheerReactionRepository(db *gorm.DB) repository.CheerReactionRepository {
	return &cheerReactionRepositoryImpl{db: db}
}

func (r *cheerReactionRepositoryImpl) Create(ctx context.Context, e *entity.CheerReaction) error {
	return wrapCreateError(r.db.WithContext(ctx).Create(e).Error, "cheer reaction")
}

func (r *cheerReactionRepositoryImpl) FindByID(ctx context.Context, id uint) (*entity.CheerReaction, error) {
	var c entity.CheerReaction
	if err := r.db.WithContext(ctx).First(&c, id).Error; err != nil {
		return nil, wrapNotFoundError(err, "cheer reaction")
	}
	return &c, nil
}

func (r *cheerReactionRepositoryImpl) Update(ctx context.Context, e *entity.CheerReaction) error {
	return wrapUpdateError(r.db.WithContext(ctx).Save(e).Error, "cheer reaction")
}

func (r *cheerReactionRepositoryImpl) Delete(ctx context.Context, id uint) error {
	return wrapDeleteError(r.db.WithContext(ctx).Delete(&entity.CheerReaction{}, id).Error, "cheer reaction")
}

func (r *cheerReactionRepositoryImpl) List(ctx context.Context, offset, limit int, _ query.QueryOptions) ([]entity.CheerReaction, int64, error) {
	var cs []entity.CheerReaction
	var total int64

	if err := r.db.WithContext(ctx).Model(&entity.CheerReaction{}).Count(&total).Error; err != nil {
		return nil, 0, wrapListError(err, "cheer reaction")
	}
	if err := r.db.WithContext(ctx).Model(&entity.CheerReaction{}).
		Offset(offset).Limit(limit).Find(&cs).Error; err != nil {
		return nil, 0, wrapListError(err, "cheer reaction")
	}
	return cs, total, nil
}

func (r *cheerReactionRepositoryImpl) Exists(ctx context.Context, id uint) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&entity.CheerReaction{}).Where("id = ?", id).Count(&count).Error; err != nil {
		return false, wrapListError(err, "cheer reaction")
	}
	return count > 0, nil
}

func (r *cheerReactionRepositoryImpl) CountSentToday(ctx context.Context, senderID, recipientID uint, date time.Time) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&entity.CheerReaction{}).
		Where("sender_id = ? AND recipient_id = ? AND sent_date = ?", senderID, recipientID, date.Truncate(24*time.Hour)).
		Count(&count).Error; err != nil {
		return 0, wrapListError(err, "cheer reaction")
	}
	return count, nil
}

func (r *cheerReactionRepositoryImpl) FindLatestSentToday(ctx context.Context, senderID, recipientID uint, date time.Time) (*entity.CheerReaction, error) {
	var c entity.CheerReaction
	if err := r.db.WithContext(ctx).
		Where("sender_id = ? AND recipient_id = ? AND sent_date = ?", senderID, recipientID, date.Truncate(24*time.Hour)).
		Order("created_at DESC").
		First(&c).Error; err != nil {
		return nil, wrapNotFoundError(err, "cheer reaction")
	}
	return &c, nil
}

func (r *cheerReactionRepositoryImpl) CountReceivedToday(ctx context.Context, recipientID uint, date time.Time) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&entity.CheerReaction{}).
		Where("recipient_id = ? AND sent_date = ?", recipientID, date.Truncate(24*time.Hour)).
		Count(&count).Error; err != nil {
		return 0, wrapListError(err, "cheer reaction")
	}
	return count, nil
}

func (r *cheerReactionRepositoryImpl) FindSentTodayBulk(ctx context.Context, senderID uint, recipientIDs []uint, date time.Time) ([]entity.CheerReaction, error) {
	if len(recipientIDs) == 0 {
		return nil, nil
	}
	var cs []entity.CheerReaction
	if err := r.db.WithContext(ctx).
		Where("sender_id = ? AND recipient_id IN ? AND sent_date = ?", senderID, recipientIDs, date.Truncate(24*time.Hour)).
		Order("created_at DESC").
		Find(&cs).Error; err != nil {
		return nil, wrapListError(err, "cheer reaction")
	}
	return cs, nil
}

func (r *cheerReactionRepositoryImpl) CountReceivedTodayBulk(ctx context.Context, recipientIDs []uint, date time.Time) (map[uint]int64, error) {
	if len(recipientIDs) == 0 {
		return map[uint]int64{}, nil
	}
	type row struct {
		RecipientID uint
		Count       int64
	}
	var rows []row
	if err := r.db.WithContext(ctx).
		Model(&entity.CheerReaction{}).
		Select("recipient_id, COUNT(*) AS count").
		Where("recipient_id IN ? AND sent_date = ?", recipientIDs, date.Truncate(24*time.Hour)).
		Group("recipient_id").
		Scan(&rows).Error; err != nil {
		return nil, wrapListError(err, "cheer reaction")
	}
	result := make(map[uint]int64, len(rows))
	for _, r := range rows {
		result[r.RecipientID] = r.Count
	}
	return result, nil
}

var _ repository.CheerReactionRepository = (*cheerReactionRepositoryImpl)(nil)
