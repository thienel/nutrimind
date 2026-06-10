package persistence

import (
	"context"

	"gorm.io/gorm"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/domain/repository"
	"nutrimind-backend/pkg/query"
)

// --- Challenge (catalogue) ---

type challengeRepositoryImpl struct {
	db *gorm.DB
}

func NewChallengeRepository(db *gorm.DB) repository.ChallengeRepository {
	return &challengeRepositoryImpl{db: db}
}

func (r *challengeRepositoryImpl) Create(ctx context.Context, e *entity.Challenge) error {
	return wrapCreateError(r.db.WithContext(ctx).Create(e).Error, "challenge")
}

func (r *challengeRepositoryImpl) FindByID(ctx context.Context, id uint) (*entity.Challenge, error) {
	var c entity.Challenge
	if err := r.db.WithContext(ctx).First(&c, id).Error; err != nil {
		return nil, wrapNotFoundError(err, "challenge")
	}
	return &c, nil
}

func (r *challengeRepositoryImpl) Update(ctx context.Context, e *entity.Challenge) error {
	return wrapUpdateError(r.db.WithContext(ctx).Save(e).Error, "challenge")
}

func (r *challengeRepositoryImpl) Delete(ctx context.Context, id uint) error {
	return wrapDeleteError(r.db.WithContext(ctx).Delete(&entity.Challenge{}, id).Error, "challenge")
}

func (r *challengeRepositoryImpl) List(ctx context.Context, offset, limit int, _ query.QueryOptions) ([]entity.Challenge, int64, error) {
	var cs []entity.Challenge
	var total int64
	q := r.db.WithContext(ctx).Model(&entity.Challenge{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, wrapListError(err, "challenge")
	}
	if err := q.Offset(offset).Limit(limit).Find(&cs).Error; err != nil {
		return nil, 0, wrapListError(err, "challenge")
	}
	return cs, total, nil
}

func (r *challengeRepositoryImpl) Exists(ctx context.Context, id uint) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&entity.Challenge{}).Where("id = ?", id).Count(&count).Error; err != nil {
		return false, wrapListError(err, "challenge")
	}
	return count > 0, nil
}

func (r *challengeRepositoryImpl) FindAll(ctx context.Context) ([]entity.Challenge, error) {
	var cs []entity.Challenge
	if err := r.db.WithContext(ctx).Order("id ASC").Find(&cs).Error; err != nil {
		return nil, wrapListError(err, "challenge")
	}
	return cs, nil
}

func (r *challengeRepositoryImpl) FirstOrCreate(ctx context.Context, challenge *entity.Challenge) error {
	return wrapCreateError(
		r.db.WithContext(ctx).
			Where("type = ? AND name = ?", challenge.Type, challenge.Name).
			FirstOrCreate(challenge).Error,
		"challenge",
	)
}

var _ repository.ChallengeRepository = (*challengeRepositoryImpl)(nil)

// --- ChallengeEnrollment ---

type challengeEnrollmentRepositoryImpl struct {
	db *gorm.DB
}

func NewChallengeEnrollmentRepository(db *gorm.DB) repository.ChallengeEnrollmentRepository {
	return &challengeEnrollmentRepositoryImpl{db: db}
}

func (r *challengeEnrollmentRepositoryImpl) Create(ctx context.Context, e *entity.ChallengeEnrollment) error {
	return wrapCreateError(r.db.WithContext(ctx).Create(e).Error, "enrollment")
}

func (r *challengeEnrollmentRepositoryImpl) FindByID(ctx context.Context, id uint) (*entity.ChallengeEnrollment, error) {
	var e entity.ChallengeEnrollment
	if err := r.db.WithContext(ctx).First(&e, id).Error; err != nil {
		return nil, wrapNotFoundError(err, "enrollment")
	}
	return &e, nil
}

func (r *challengeEnrollmentRepositoryImpl) Update(ctx context.Context, e *entity.ChallengeEnrollment) error {
	return wrapUpdateError(r.db.WithContext(ctx).Save(e).Error, "enrollment")
}

func (r *challengeEnrollmentRepositoryImpl) Delete(ctx context.Context, id uint) error {
	return wrapDeleteError(r.db.WithContext(ctx).Delete(&entity.ChallengeEnrollment{}, id).Error, "enrollment")
}

func (r *challengeEnrollmentRepositoryImpl) List(ctx context.Context, offset, limit int, _ query.QueryOptions) ([]entity.ChallengeEnrollment, int64, error) {
	var es []entity.ChallengeEnrollment
	var total int64
	q := r.db.WithContext(ctx).Model(&entity.ChallengeEnrollment{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, wrapListError(err, "enrollment")
	}
	if err := q.Offset(offset).Limit(limit).Find(&es).Error; err != nil {
		return nil, 0, wrapListError(err, "enrollment")
	}
	return es, total, nil
}

func (r *challengeEnrollmentRepositoryImpl) Exists(ctx context.Context, id uint) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&entity.ChallengeEnrollment{}).Where("id = ?", id).Count(&count).Error; err != nil {
		return false, wrapListError(err, "enrollment")
	}
	return count > 0, nil
}

func (r *challengeEnrollmentRepositoryImpl) FindActiveByUserAndChallenge(ctx context.Context, userID, challengeID uint) (*entity.ChallengeEnrollment, error) {
	var e entity.ChallengeEnrollment
	if err := r.db.WithContext(ctx).
		Where("user_id = ? AND challenge_id = ? AND status = ?", userID, challengeID, entity.EnrollmentStatusActive).
		First(&e).Error; err != nil {
		return nil, wrapNotFoundError(err, "enrollment")
	}
	return &e, nil
}

func (r *challengeEnrollmentRepositoryImpl) FindByUserAndChallenge(ctx context.Context, userID, challengeID uint) (*entity.ChallengeEnrollment, error) {
	var e entity.ChallengeEnrollment
	if err := r.db.WithContext(ctx).
		Where("user_id = ? AND challenge_id = ?", userID, challengeID).
		Order("created_at DESC").
		First(&e).Error; err != nil {
		return nil, wrapNotFoundError(err, "enrollment")
	}
	return &e, nil
}

func (r *challengeEnrollmentRepositoryImpl) FindActiveByUserID(ctx context.Context, userID uint) ([]entity.ChallengeEnrollment, error) {
	var es []entity.ChallengeEnrollment
	if err := r.db.WithContext(ctx).
		Where("user_id = ? AND status = ?", userID, entity.EnrollmentStatusActive).
		Find(&es).Error; err != nil {
		return nil, wrapListError(err, "enrollment")
	}
	return es, nil
}

func (r *challengeEnrollmentRepositoryImpl) FindAllActive(ctx context.Context) ([]entity.ChallengeEnrollment, error) {
	var es []entity.ChallengeEnrollment
	if err := r.db.WithContext(ctx).
		Where("status = ?", entity.EnrollmentStatusActive).
		Find(&es).Error; err != nil {
		return nil, wrapListError(err, "enrollment")
	}
	return es, nil
}

func (r *challengeEnrollmentRepositoryImpl) CountActiveFriendsByChallengeIDs(ctx context.Context, challengeIDs []uint, friendIDs []uint) (map[uint]int, error) {
	if len(challengeIDs) == 0 || len(friendIDs) == 0 {
		return map[uint]int{}, nil
	}
	type row struct {
		ChallengeID uint
		Count       int
	}
	var rows []row
	if err := r.db.WithContext(ctx).
		Model(&entity.ChallengeEnrollment{}).
		Select("challenge_id, COUNT(*) AS count").
		Where("challenge_id IN ? AND user_id IN ? AND status = ?", challengeIDs, friendIDs, entity.EnrollmentStatusActive).
		Group("challenge_id").
		Scan(&rows).Error; err != nil {
		return nil, wrapListError(err, "enrollment")
	}
	result := make(map[uint]int, len(rows))
	for _, r := range rows {
		result[r.ChallengeID] = r.Count
	}
	return result, nil
}

func (r *challengeEnrollmentRepositoryImpl) FindActiveByFriendsAndChallenge(ctx context.Context, challengeID uint, friendIDs []uint) ([]entity.ChallengeEnrollment, error) {
	if len(friendIDs) == 0 {
		return nil, nil
	}
	var es []entity.ChallengeEnrollment
	if err := r.db.WithContext(ctx).
		Where("challenge_id = ? AND user_id IN ? AND status = ?", challengeID, friendIDs, entity.EnrollmentStatusActive).
		Find(&es).Error; err != nil {
		return nil, wrapListError(err, "enrollment")
	}
	return es, nil
}

var _ repository.ChallengeEnrollmentRepository = (*challengeEnrollmentRepositoryImpl)(nil)

// --- ChallengeDailyCompletion ---

type challengeDailyCompletionRepositoryImpl struct {
	db *gorm.DB
}

func NewChallengeDailyCompletionRepository(db *gorm.DB) repository.ChallengeDailyCompletionRepository {
	return &challengeDailyCompletionRepositoryImpl{db: db}
}

func (r *challengeDailyCompletionRepositoryImpl) Create(ctx context.Context, e *entity.ChallengeDailyCompletion) error {
	return wrapCreateError(r.db.WithContext(ctx).Create(e).Error, "daily completion")
}

func (r *challengeDailyCompletionRepositoryImpl) FindByID(ctx context.Context, id uint) (*entity.ChallengeDailyCompletion, error) {
	var c entity.ChallengeDailyCompletion
	if err := r.db.WithContext(ctx).First(&c, id).Error; err != nil {
		return nil, wrapNotFoundError(err, "daily completion")
	}
	return &c, nil
}

func (r *challengeDailyCompletionRepositoryImpl) Update(ctx context.Context, e *entity.ChallengeDailyCompletion) error {
	return wrapUpdateError(r.db.WithContext(ctx).Save(e).Error, "daily completion")
}

func (r *challengeDailyCompletionRepositoryImpl) Delete(ctx context.Context, id uint) error {
	return wrapDeleteError(r.db.WithContext(ctx).Delete(&entity.ChallengeDailyCompletion{}, id).Error, "daily completion")
}

func (r *challengeDailyCompletionRepositoryImpl) List(ctx context.Context, offset, limit int, _ query.QueryOptions) ([]entity.ChallengeDailyCompletion, int64, error) {
	var cs []entity.ChallengeDailyCompletion
	var total int64
	q := r.db.WithContext(ctx).Model(&entity.ChallengeDailyCompletion{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, wrapListError(err, "daily completion")
	}
	if err := q.Offset(offset).Limit(limit).Find(&cs).Error; err != nil {
		return nil, 0, wrapListError(err, "daily completion")
	}
	return cs, total, nil
}

func (r *challengeDailyCompletionRepositoryImpl) Exists(ctx context.Context, id uint) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&entity.ChallengeDailyCompletion{}).Where("id = ?", id).Count(&count).Error; err != nil {
		return false, wrapListError(err, "daily completion")
	}
	return count > 0, nil
}

func (r *challengeDailyCompletionRepositoryImpl) FindByEnrollmentID(ctx context.Context, enrollmentID uint) ([]entity.ChallengeDailyCompletion, error) {
	var cs []entity.ChallengeDailyCompletion
	if err := r.db.WithContext(ctx).
		Where("enrollment_id = ?", enrollmentID).
		Order("completion_date ASC").
		Find(&cs).Error; err != nil {
		return nil, wrapListError(err, "daily completion")
	}
	return cs, nil
}

func (r *challengeDailyCompletionRepositoryImpl) CountMetGoalByEnrollmentID(ctx context.Context, enrollmentID uint) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&entity.ChallengeDailyCompletion{}).
		Where("enrollment_id = ? AND met_goal = true", enrollmentID).
		Count(&count).Error; err != nil {
		return 0, wrapListError(err, "daily completion")
	}
	return count, nil
}

func (r *challengeDailyCompletionRepositoryImpl) FindByEnrollmentIDs(ctx context.Context, enrollmentIDs []uint) ([]entity.ChallengeDailyCompletion, error) {
	if len(enrollmentIDs) == 0 {
		return nil, nil
	}
	var cs []entity.ChallengeDailyCompletion
	if err := r.db.WithContext(ctx).
		Where("enrollment_id IN ?", enrollmentIDs).
		Order("completion_date ASC").
		Find(&cs).Error; err != nil {
		return nil, wrapListError(err, "daily completion")
	}
	return cs, nil
}

var _ repository.ChallengeDailyCompletionRepository = (*challengeDailyCompletionRepositoryImpl)(nil)
