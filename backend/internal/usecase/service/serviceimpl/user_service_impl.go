package serviceimpl

import (
	"context"

	"github.com/thienel/tlog"
	"go.uber.org/zap"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/domain/repository"
	"nutrimind-backend/internal/usecase/service"
	apperror "nutrimind-backend/pkg/error"
	"nutrimind-backend/pkg/query"
)

type userServiceImpl struct {
	userRepo repository.UserRepository
}

// NewUserService creates a new user service
func NewUserService(userRepo repository.UserRepository) service.UserService {
	return &userServiceImpl{userRepo: userRepo}
}

func (s *userServiceImpl) GetByID(ctx context.Context, id uint) (*entity.User, error) {
	user, err := s.userRepo.FindByID(ctx, id)
	if err != nil {
		tlog.Debug("Get user failed: not found", zap.Uint("user_id", id))
		return nil, err
	}
	return user, nil
}

func (s *userServiceImpl) Update(ctx context.Context, cmd service.UpdateUserCommand) (*entity.User, error) {
	user, err := s.userRepo.FindByID(ctx, cmd.ID)
	if err != nil {
		tlog.Debug("Update user failed: not found", zap.Uint("user_id", cmd.ID))
		return nil, err
	}

	// Update role
	if cmd.Role != "" {
		if !entity.IsValidUserRole(cmd.Role) {
			return nil, apperror.ErrValidation.WithMessage("Role không hợp lệ")
		}
		user.Role = cmd.Role
	}

	// Update status
	if cmd.Status != "" {
		if !entity.IsValidUserStatus(cmd.Status) {
			return nil, apperror.ErrValidation.WithMessage("Status không hợp lệ")
		}
		user.Status = cmd.Status
	}

	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}

	tlog.Info("User updated", zap.Uint("user_id", user.ID))
	return user, nil
}

func (s *userServiceImpl) Delete(ctx context.Context, id uint) error {
	if _, err := s.userRepo.FindByID(ctx, id); err != nil {
		tlog.Debug("Delete user failed: not found", zap.Uint("user_id", id))
		return err
	}
	if err := s.userRepo.Delete(ctx, id); err != nil {
		return err
	}
	tlog.Info("User deleted", zap.Uint("user_id", id))
	return nil
}

func (s *userServiceImpl) List(ctx context.Context, offset, limit int, opts query.QueryOptions) ([]*entity.User, int64, error) {
	return s.userRepo.ListWithQuery(ctx, offset, limit, opts)
}
