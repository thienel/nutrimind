package serviceimpl

import (
	"context"
	"fmt"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/domain/repository"
	"nutrimind-backend/internal/usecase/service"
	apperror "nutrimind-backend/pkg/error"
)

type healthProfileServiceImpl struct {
	profileRepo repository.HealthProfileRepository
	userRepo    repository.UserRepository
}

// NewHealthProfileService creates a new health profile service.
func NewHealthProfileService(
	profileRepo repository.HealthProfileRepository,
	userRepo repository.UserRepository,
) service.HealthProfileService {
	return &healthProfileServiceImpl{
		profileRepo: profileRepo,
		userRepo:    userRepo,
	}
}

// CreateProfile creates a health profile for a user for the first time.
func (s *healthProfileServiceImpl) CreateProfile(ctx context.Context, cmd service.CreateHealthProfileCommand) (*entity.HealthProfile, error) {
	// 1. Validate business rules
	if err := validateCreateProfileCommand(cmd); err != nil {
		return nil, err
	}

	// 2. Verify the user exists
	if _, err := s.userRepo.FindByID(ctx, cmd.UserID); err != nil {
		return nil, apperror.ErrNotFound.WithMessage("Người dùng không tồn tại")
	}

	// 3. Ensure the user does not already have a profile (1-1 constraint)
	existing, err := s.profileRepo.FindByUserID(ctx, cmd.UserID)
	if err == nil && existing != nil {
		return nil, apperror.ErrConflict.WithMessage("Health profile đã tồn tại, vui lòng cập nhật thay vì tạo mới")
	}

	// 4. Build and persist the new profile
	profile := &entity.HealthProfile{
		UserID:        cmd.UserID,
		FullName:      cmd.FullName,
		Age:           cmd.Age,
		Gender:        cmd.Gender,
		HeightCm:      cmd.HeightCm,
		WeightKg:      cmd.WeightKg,
		Goal:          cmd.Goal,
		ActivityLevel: cmd.ActivityLevel,
	}

	if err := s.profileRepo.Create(ctx, profile); err != nil {
		return nil, fmt.Errorf("create health profile: %w", err)
	}

	return profile, nil
}

// GetProfileByUserID returns the health profile for the given user.
func (s *healthProfileServiceImpl) GetProfileByUserID(ctx context.Context, userID uint) (*entity.HealthProfile, error) {
	profile, err := s.profileRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, apperror.ErrNotFound.WithMessage("Chưa có health profile, vui lòng tạo mới")
	}
	return profile, nil
}

// validateCreateProfileCommand validates the command fields.
func validateCreateProfileCommand(cmd service.CreateHealthProfileCommand) error {
	var errs []string

	if cmd.FullName == "" {
		errs = append(errs, "tên không được để trống")
	}
	if cmd.Age <= 0 || cmd.Age > 150 {
		errs = append(errs, "tuổi phải trong khoảng 1–150")
	}
	if !entity.IsValidGender(cmd.Gender) {
		errs = append(errs, fmt.Sprintf("giới tính không hợp lệ: phải là %s, %s hoặc %s", entity.GenderMale, entity.GenderFemale, entity.GenderOther))
	}
	if cmd.HeightCm < 50 || cmd.HeightCm > 300 {
		errs = append(errs, "chiều cao phải trong khoảng 50–300 cm")
	}
	if cmd.WeightKg < 10 || cmd.WeightKg > 500 {
		errs = append(errs, "cân nặng phải trong khoảng 10–500 kg")
	}
	if !entity.IsValidGoal(cmd.Goal) {
		errs = append(errs, fmt.Sprintf("mục tiêu không hợp lệ: phải là LOSE_WEIGHT, MAINTAIN, GAIN_MUSCLE hoặc IMPROVE_HEALTH"))
	}
	if !entity.IsValidActivityLevel(cmd.ActivityLevel) {
		errs = append(errs, "mức vận động không hợp lệ: phải là SEDENTARY, LIGHTLY_ACTIVE, MODERATELY_ACTIVE, VERY_ACTIVE hoặc EXTRA_ACTIVE")
	}

	if len(errs) > 0 {
		return apperror.ErrBadRequest.WithMessage(errs[0])
	}
	return nil
}

// ensure compile-time interface satisfaction
var _ service.HealthProfileService = (*healthProfileServiceImpl)(nil)
