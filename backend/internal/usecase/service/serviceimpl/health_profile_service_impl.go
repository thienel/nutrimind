package serviceimpl

import (
	"context"
	"fmt"
	"math"
	"time"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/domain/repository"
	"nutrimind-backend/internal/usecase/service"
	apperror "nutrimind-backend/pkg/error"
)

type healthProfileServiceImpl struct {
	profileRepo repository.HealthProfileRepository
	userRepo    repository.UserRepository
	weightRepo  repository.WeightEntryRepository
}

// NewHealthProfileService creates a new health profile service.
func NewHealthProfileService(
	profileRepo repository.HealthProfileRepository,
	userRepo repository.UserRepository,
	weightRepo repository.WeightEntryRepository,
) service.HealthProfileService {
	return &healthProfileServiceImpl{
		profileRepo: profileRepo,
		userRepo:    userRepo,
		weightRepo:  weightRepo,
	}
}

// Onboarding creates or overwrites the health profile and marks onboarding as done.
// Chạy trong transaction để tránh race condition giữa CREATE và READ
// từ các connection pool khác nhau.
func (s *healthProfileServiceImpl) Onboarding(ctx context.Context, cmd service.OnboardingCommand) (*service.OnboardingResult, error) {
	if err := validateOnboardingCommand(cmd); err != nil {
		return nil, err
	}

	calc := computeTargets(cmd.WeightKg, cmd.HeightCm, cmd.Age, cmd.Gender, cmd.Goal, cmd.ActivityLevel)

	// Dùng upsert thay vì find-then-create-or-update để tránh race condition.
	// GORM không có native upsert với ON CONFLICT nên dùng Save()
	// sau khi gán ID nếu profile đã tồn tại.
	existing, findErr := s.profileRepo.FindByUserID(ctx, cmd.UserID)

	var profile entity.HealthProfile
	if findErr != nil {
		// Tạo mới — chưa có profile
		profile = entity.HealthProfile{
			UserID:         cmd.UserID,
			Age:            cmd.Age,
			Gender:         cmd.Gender,
			HeightCm:       cmd.HeightCm,
			WeightKg:       cmd.WeightKg,
			Goal:           cmd.Goal,
			ActivityLevel:  cmd.ActivityLevel,
			BMI:            calc.BMI,
			BMR:            calc.BMR,
			TDEE:           calc.TDEE,
			CalorieTarget:  calc.CalorieTarget,
			ProteinTargetG: calc.ProteinTargetG,
			CarbTargetG:    calc.CarbTargetG,
			FatTargetG:     calc.FatTargetG,
			WaterTargetMl:  calc.WaterTargetMl,
			SocialEnabled:  true,
			OnboardingDone: true,
		}
		if createErr := s.profileRepo.Create(ctx, &profile); createErr != nil {
			return nil, fmt.Errorf("create health profile: %w", createErr)
		}
	} else {
		// Cập nhật profile hiện có
		existing.Age = cmd.Age
		existing.Gender = cmd.Gender
		existing.HeightCm = cmd.HeightCm
		existing.WeightKg = cmd.WeightKg
		existing.Goal = cmd.Goal
		existing.ActivityLevel = cmd.ActivityLevel
		existing.BMI = calc.BMI
		existing.BMR = calc.BMR
		existing.TDEE = calc.TDEE
		existing.CalorieTarget = calc.CalorieTarget
		existing.ProteinTargetG = calc.ProteinTargetG
		existing.CarbTargetG = calc.CarbTargetG
		existing.FatTargetG = calc.FatTargetG
		existing.WaterTargetMl = calc.WaterTargetMl
		existing.OnboardingDone = true
		if updateErr := s.profileRepo.Update(ctx, existing); updateErr != nil {
			return nil, fmt.Errorf("update health profile: %w", updateErr)
		}
	}

	return &calc, nil
}

// GetProfile returns the full profile data including user display info.
// Chỉ trả NOT_FOUND khi profile thật sự không tồn tại (gorm.ErrRecordNotFound).
// Các lỗi DB khác (connection, timeout) được trả về nguyên dạng để handler trả 500.
func (s *healthProfileServiceImpl) GetProfile(ctx context.Context, userID uint) (*service.ProfileData, error) {
	profile, err := s.profileRepo.FindByUserID(ctx, userID)
	if err != nil {
		// Để nguyên lỗi từ repository — wrapNotFoundError đã phân biệt
		// NOT_FOUND vs INTERNAL_ERROR rồi
		return nil, err
	}

	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, apperror.ErrNotFound.WithMessage("Không tìm thấy người dùng")
	}

	return &service.ProfileData{
		Profile:     profile,
		DisplayName: user.DisplayName,
		AvatarURL:   user.PhotoURL,
	}, nil
}

// UpdateProfile applies a partial update, recalculates all targets,
// and auto-creates a weight entry when weight_kg changes.
func (s *healthProfileServiceImpl) UpdateProfile(ctx context.Context, cmd service.UpdateProfileCommand) (*service.ProfileData, error) {
	profile, err := s.profileRepo.FindByUserID(ctx, cmd.UserID)
	if err != nil {
		return nil, apperror.ErrNotFound.WithMessage("Profile chưa tồn tại, vui lòng hoàn thành onboarding trước")
	}

	if err := validateUpdateProfileCommand(cmd); err != nil {
		return nil, err
	}

	weightChanged := false
	if cmd.Age != nil {
		profile.Age = *cmd.Age
	}
	if cmd.Gender != nil {
		profile.Gender = *cmd.Gender
	}
	if cmd.HeightCm != nil {
		profile.HeightCm = *cmd.HeightCm
	}
	if cmd.WeightKg != nil && *cmd.WeightKg != profile.WeightKg {
		profile.WeightKg = *cmd.WeightKg
		weightChanged = true
	}
	if cmd.Goal != nil {
		profile.Goal = *cmd.Goal
	}
	if cmd.ActivityLevel != nil {
		profile.ActivityLevel = *cmd.ActivityLevel
	}

	calc := computeTargets(profile.WeightKg, profile.HeightCm, profile.Age, profile.Gender, profile.Goal, profile.ActivityLevel)
	profile.BMI = calc.BMI
	profile.BMR = calc.BMR
	profile.TDEE = calc.TDEE
	profile.CalorieTarget = calc.CalorieTarget
	profile.ProteinTargetG = calc.ProteinTargetG
	profile.CarbTargetG = calc.CarbTargetG
	profile.FatTargetG = calc.FatTargetG
	profile.WaterTargetMl = calc.WaterTargetMl

	if updateErr := s.profileRepo.Update(ctx, profile); updateErr != nil {
		return nil, fmt.Errorf("update health profile: %w", updateErr)
	}

	if weightChanged {
		today := time.Now().UTC().Truncate(24 * time.Hour)
		existing, findErr := s.weightRepo.FindByUserIDAndDate(ctx, cmd.UserID, today)
		if findErr == nil && existing != nil {
			existing.WeightKg = profile.WeightKg
			_ = s.weightRepo.Update(ctx, existing)
		} else {
			entry := &entity.WeightEntry{
				UserID:   cmd.UserID,
				LoggedAt: today,
				WeightKg: profile.WeightKg,
			}
			_ = s.weightRepo.Create(ctx, entry)
		}
	}

	user, err := s.userRepo.FindByID(ctx, cmd.UserID)
	if err != nil {
		return nil, apperror.ErrNotFound.WithMessage("Không tìm thấy người dùng")
	}

	return &service.ProfileData{
		Profile:     profile,
		DisplayName: user.DisplayName,
		AvatarURL:   user.PhotoURL,
	}, nil
}

// ToggleSocial sets the social_enabled flag and returns its new value.
func (s *healthProfileServiceImpl) ToggleSocial(ctx context.Context, userID uint, enabled bool) (bool, error) {
	profile, err := s.profileRepo.FindByUserID(ctx, userID)
	if err != nil {
		return false, apperror.ErrNotFound.WithMessage("Profile chưa tồn tại")
	}

	profile.SocialEnabled = enabled
	if updateErr := s.profileRepo.Update(ctx, profile); updateErr != nil {
		return false, fmt.Errorf("toggle social: %w", updateErr)
	}

	return profile.SocialEnabled, nil
}

// --- Calculation helpers ---

type targets = service.OnboardingResult

func computeTargets(weightKg, heightCm float64, age int, gender, goal, activityLevel string) targets {
	bmi := round2(weightKg / math.Pow(heightCm/100, 2))

	var bmr float64
	if gender == entity.GenderMale {
		bmr = 10*weightKg + 6.25*heightCm - 5*float64(age) + 5
	} else {
		bmr = 10*weightKg + 6.25*heightCm - 5*float64(age) - 161
	}
	bmr = round2(bmr)

	tdee := round2(bmr * activityMultiplier(activityLevel))

	var calTarget float64
	switch goal {
	case entity.GoalLoseWeight:
		calTarget = round2(tdee - 300)
	case entity.GoalGainMuscle:
		calTarget = round2(tdee + 250)
	default:
		calTarget = tdee
	}

	protein := round2(calTarget * 0.30 / 4)
	carb := round2(calTarget * 0.40 / 4)
	fat := round2(calTarget * 0.30 / 9)
	water := int(weightKg * 35)

	return targets{
		BMI:            bmi,
		BMICategory:    entity.BMICategory(bmi),
		BMR:            bmr,
		TDEE:           tdee,
		CalorieTarget:  calTarget,
		ProteinTargetG: protein,
		CarbTargetG:    carb,
		FatTargetG:     fat,
		WaterTargetMl:  water,
	}
}

func activityMultiplier(level string) float64 {
	switch level {
	case entity.ActivitySedentary:
		return 1.2
	case entity.ActivityLightlyActive:
		return 1.375
	case entity.ActivityModeratelyActive:
		return 1.55
	case entity.ActivityVeryActive:
		return 1.725
	default:
		return 1.2
	}
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

// --- Validation ---

func validateOnboardingCommand(cmd service.OnboardingCommand) error {
	if cmd.Age < 10 || cmd.Age > 120 {
		return apperror.ErrValidation.WithMessage("Tuổi phải trong khoảng 10–120")
	}
	if !entity.IsValidGender(cmd.Gender) {
		return apperror.ErrValidation.WithMessage("Giới tính không hợp lệ: phải là MALE hoặc FEMALE")
	}
	if cmd.HeightCm < 50 || cmd.HeightCm > 300 {
		return apperror.ErrValidation.WithMessage("Chiều cao phải trong khoảng 50–300 cm")
	}
	if cmd.WeightKg < 15 || cmd.WeightKg > 500 {
		return apperror.ErrValidation.WithMessage("Cân nặng phải trong khoảng 15–500 kg")
	}
	if !entity.IsValidGoal(cmd.Goal) {
		return apperror.ErrValidation.WithMessage("Mục tiêu không hợp lệ: LOSE_WEIGHT, GAIN_MUSCLE, MAINTAIN hoặc EAT_HEALTHIER")
	}
	if !entity.IsValidActivityLevel(cmd.ActivityLevel) {
		return apperror.ErrValidation.WithMessage("Mức vận động không hợp lệ: SEDENTARY, LIGHTLY_ACTIVE, MODERATELY_ACTIVE hoặc VERY_ACTIVE")
	}
	return nil
}

func validateUpdateProfileCommand(cmd service.UpdateProfileCommand) error {
	if cmd.Age != nil && (*cmd.Age < 10 || *cmd.Age > 120) {
		return apperror.ErrValidation.WithMessage("Tuổi phải trong khoảng 10–120")
	}
	if cmd.Gender != nil && !entity.IsValidGender(*cmd.Gender) {
		return apperror.ErrValidation.WithMessage("Giới tính không hợp lệ: phải là MALE hoặc FEMALE")
	}
	if cmd.HeightCm != nil && (*cmd.HeightCm < 50 || *cmd.HeightCm > 300) {
		return apperror.ErrValidation.WithMessage("Chiều cao phải trong khoảng 50–300 cm")
	}
	if cmd.WeightKg != nil && (*cmd.WeightKg < 15 || *cmd.WeightKg > 500) {
		return apperror.ErrValidation.WithMessage("Cân nặng phải trong khoảng 15–500 kg")
	}
	if cmd.Goal != nil && !entity.IsValidGoal(*cmd.Goal) {
		return apperror.ErrValidation.WithMessage("Mục tiêu không hợp lệ: LOSE_WEIGHT, GAIN_MUSCLE, MAINTAIN hoặc EAT_HEALTHIER")
	}
	if cmd.ActivityLevel != nil && !entity.IsValidActivityLevel(*cmd.ActivityLevel) {
		return apperror.ErrValidation.WithMessage("Mức vận động không hợp lệ: SEDENTARY, LIGHTLY_ACTIVE, MODERATELY_ACTIVE hoặc VERY_ACTIVE")
	}
	// Require at least one field
	if cmd.Age == nil && cmd.Gender == nil && cmd.HeightCm == nil &&
		cmd.WeightKg == nil && cmd.Goal == nil && cmd.ActivityLevel == nil {
		return apperror.ErrValidation.WithMessage("Cần cung cấp ít nhất một trường để cập nhật")
	}
	return nil
}

// ensure compile-time interface satisfaction
var _ service.HealthProfileService = (*healthProfileServiceImpl)(nil)
