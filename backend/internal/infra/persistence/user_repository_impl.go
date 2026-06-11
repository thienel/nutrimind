package persistence

import (
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/domain/repository"
	apperror "nutrimind-backend/pkg/error"
	"nutrimind-backend/pkg/query"
)

var userAllowedFields = map[string]bool{
	"id":           true,
	"google_id":    true,
	"email":        true,
	"display_name": true,
	"role":         true,
	"status":       true,
	"created_at":   true,
	"updated_at":   true,
}

type userRepositoryImpl struct {
	db *gorm.DB
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *gorm.DB) repository.UserRepository {
	return &userRepositoryImpl{db: db}
}

// --- BaseRepository Methods ---

func (r *userRepositoryImpl) Create(ctx context.Context, e *entity.User) error {
	if err := r.db.WithContext(ctx).Create(e).Error; err != nil {
		if isDuplicateKeyError(err) {
			return apperror.ErrConflict.WithMessage("Email hoặc Google ID đã tồn tại").WithError(err)
		}
		return wrapCreateError(err, "người dùng")
	}
	return nil
}

func (r *userRepositoryImpl) FindByID(ctx context.Context, id uint) (*entity.User, error) {
	var u entity.User
	if err := r.db.WithContext(ctx).First(&u, id).Error; err != nil {
		return nil, wrapNotFoundError(err, "người dùng")
	}
	return &u, nil
}

func (r *userRepositoryImpl) Update(ctx context.Context, e *entity.User) error {
	if err := r.db.WithContext(ctx).Save(e).Error; err != nil {
		return wrapUpdateError(err, "người dùng")
	}
	return nil
}

func (r *userRepositoryImpl) Delete(ctx context.Context, id uint) error {
	// GORM soft delete: sets deleted_at
	if err := r.db.WithContext(ctx).Delete(&entity.User{}, id).Error; err != nil {
		return wrapDeleteError(err, "người dùng")
	}
	return nil
}

func (r *userRepositoryImpl) List(ctx context.Context, offset, limit int, opts query.QueryOptions) ([]entity.User, int64, error) {
	users, total, err := r.ListWithQuery(ctx, offset, limit, opts)
	if err != nil {
		return nil, 0, err
	}
	res := make([]entity.User, len(users))
	for i, u := range users {
		res[i] = *u
	}
	return res, total, nil
}

func (r *userRepositoryImpl) Exists(ctx context.Context, id uint) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&entity.User{}).Where("id = ?", id).Count(&count).Error; err != nil {
		return false, wrapListError(err, "người dùng")
	}
	return count > 0, nil
}

// --- UserRepository Methods ---

func (r *userRepositoryImpl) FindByGoogleID(ctx context.Context, googleID string) (*entity.User, error) {
	var u entity.User
	if err := r.db.WithContext(ctx).Where("google_id = ?", googleID).First(&u).Error; err != nil {
		return nil, wrapNotFoundError(err, "người dùng")
	}
	return &u, nil
}

func (r *userRepositoryImpl) FindByEmail(ctx context.Context, email string) (*entity.User, error) {
	var u entity.User
	if err := r.db.WithContext(ctx).Where("email = ?", email).First(&u).Error; err != nil {
		return nil, wrapNotFoundError(err, "người dùng")
	}
	return &u, nil
}

func (r *userRepositoryImpl) ListWithQuery(ctx context.Context, offset, limit int, opts query.QueryOptions) ([]*entity.User, int64, error) {
	var users []*entity.User
	var total int64

	q := r.db.WithContext(ctx).Model(&entity.User{})

	// Search filter
	if searchFilter, ok := opts.Filters["search"]; ok {
		if searchValue, ok := searchFilter.Value.(string); ok && searchValue != "" {
			pattern := "%" + searchValue + "%"
			q = q.Where("email ILIKE ? OR display_name ILIKE ?", pattern, pattern)
		}
	}

	// Count total
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, wrapListError(err, "người dùng")
	}

	// Sorting
	if len(opts.Sort) > 0 {
		for _, sort := range opts.Sort {
			if !userAllowedFields[sort.Field] {
				continue
			}
			order := sort.Field
			if sort.Desc {
				order = fmt.Sprintf("%s DESC", sort.Field)
			} else {
				order = fmt.Sprintf("%s ASC", sort.Field)
			}
			q = q.Order(order)
		}
	} else {
		q = q.Order("created_at DESC")
	}

	if err := q.Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		return nil, 0, wrapListError(err, "người dùng")
	}

	return users, total, nil
}

func (r *userRepositoryImpl) FindByIDs(ctx context.Context, ids []uint) ([]entity.User, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	var users []entity.User
	if err := r.db.WithContext(ctx).Where("id IN ?", ids).Find(&users).Error; err != nil {
		return nil, wrapListError(err, "người dùng")
	}
	return users, nil
}

func (r *userRepositoryImpl) SearchSocial(ctx context.Context, q string, excludeUserID uint) ([]entity.User, error) {
	var users []entity.User
	pattern := "%" + q + "%"
	if err := r.db.WithContext(ctx).
		Where("id != ? AND (display_name ILIKE ? OR email ILIKE ?)", excludeUserID, pattern, pattern).
		Limit(20).
		Find(&users).Error; err != nil {
		return nil, wrapListError(err, "người dùng")
	}
	return users, nil
}

func (r *userRepositoryImpl) UpdateLastActivityAt(ctx context.Context, userID uint, at time.Time) error {
	if err := r.db.WithContext(ctx).Model(&entity.User{}).Where("id = ?", userID).
		Update("last_activity_at", at).Error; err != nil {
		return wrapUpdateError(err, "người dùng")
	}
	return nil
}

var _ repository.UserRepository = (*userRepositoryImpl)(nil)
