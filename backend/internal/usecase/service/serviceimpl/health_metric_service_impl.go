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

type healthMetricServiceImpl struct {
	profileRepo repository.HealthProfileRepository
	weightRepo  repository.WeightEntryRepository
}

// NewHealthMetricService creates a new HealthMetricService.
func NewHealthMetricService(
	profileRepo repository.HealthProfileRepository,
	weightRepo repository.WeightEntryRepository,
) service.HealthMetricService {
	return &healthMetricServiceImpl{
		profileRepo: profileRepo,
		weightRepo:  weightRepo,
	}
}

// LogWeight validates, upserts the weight entry, then syncs profile fields.
func (s *healthMetricServiceImpl) LogWeight(ctx context.Context, cmd service.LogWeightMetricCommand) (*service.WeightLogResult, error) {
	// --- Require onboarding ---
	profile, err := s.profileRepo.FindByUserID(ctx, cmd.UserID)
	if err != nil || !profile.OnboardingDone {
		return nil, apperror.ErrOnboardingRequired.WithMessage("Vui lòng hoàn thành onboarding trước khi ghi cân nặng")
	}

	// --- Validate ---
	if err := validateLogWeightMetricCommand(cmd); err != nil {
		return nil, err
	}

	loggedAt := cmd.LoggedAt.UTC().Truncate(24 * time.Hour)

	// --- Upsert ---
	entry, err := s.weightRepo.FindByUserIDAndDate(ctx, cmd.UserID, loggedAt)
	if err == nil && entry != nil {
		entry.WeightKg = cmd.WeightKg
		entry.Note = cmd.Note
		if cmd.ClientCreatedAt != nil {
			entry.ClientCreatedAt = cmd.ClientCreatedAt
		}
		if updateErr := s.weightRepo.Update(ctx, entry); updateErr != nil {
			return nil, fmt.Errorf("update weight entry: %w", updateErr)
		}
	} else {
		entry = &entity.WeightEntry{
			UserID:          cmd.UserID,
			LoggedAt:        loggedAt,
			WeightKg:        cmd.WeightKg,
			Note:            cmd.Note,
			ClientCreatedAt: cmd.ClientCreatedAt,
		}
		if createErr := s.weightRepo.Create(ctx, entry); createErr != nil {
			return nil, fmt.Errorf("create weight entry: %w", createErr)
		}
	}

	// --- Sync profile: weight_kg, bmi, water_target_ml ---
	bmi := computeBMI(entry.WeightKg, profile.HeightCm)
	profile.WeightKg = entry.WeightKg
	profile.BMI = bmi
	profile.WaterTargetMl = int(entry.WeightKg * 35)
	if updateErr := s.profileRepo.Update(ctx, profile); updateErr != nil {
		return nil, fmt.Errorf("sync health profile: %w", updateErr)
	}

	return &service.WeightLogResult{
		ID:          entry.ID,
		WeightKg:    entry.WeightKg,
		LoggedAt:    entry.LoggedAt,
		Note:        entry.Note,
		BMI:         bmi,
		BMICategory: entity.BMICategory(bmi),
		CreatedAt:   entry.CreatedAt,
	}, nil
}

// GetWeightHistory returns paginated weight entries with computed BMI per entry.
func (s *healthMetricServiceImpl) GetWeightHistory(ctx context.Context, userID uint, limit, offset int) ([]service.WeightLogResult, int64, error) {
	if limit < 1 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	entries, total, err := s.weightRepo.ListByUserID(ctx, userID, offset, limit)
	if err != nil {
		return nil, 0, fmt.Errorf("list weight history: %w", err)
	}

	// Fetch profile once to get height for BMI calculation
	var heightCm float64
	if profile, pErr := s.profileRepo.FindByUserID(ctx, userID); pErr == nil {
		heightCm = profile.HeightCm
	}

	results := make([]service.WeightLogResult, 0, len(entries))
	for _, e := range entries {
		bmi := computeBMI(e.WeightKg, heightCm)
		results = append(results, service.WeightLogResult{
			ID:          e.ID,
			WeightKg:    e.WeightKg,
			LoggedAt:    e.LoggedAt,
			Note:        e.Note,
			BMI:         bmi,
			BMICategory: entity.BMICategory(bmi),
			CreatedAt:   e.CreatedAt,
		})
	}

	return results, total, nil
}

// GetHealthSummary returns stored targets and weight data for the health summary screen.
func (s *healthMetricServiceImpl) GetHealthSummary(ctx context.Context, userID uint) (*service.HealthSummaryResult, error) {
	profile, err := s.profileRepo.FindByUserID(ctx, userID)
	if err != nil || !profile.OnboardingDone {
		return nil, apperror.ErrNotFound.WithMessage("Profile không tồn tại hoặc chưa hoàn thành onboarding")
	}

	result := &service.HealthSummaryResult{
		BMI:            profile.BMI,
		BMICategory:    entity.BMICategory(profile.BMI),
		BMR:            profile.BMR,
		TDEE:           profile.TDEE,
		CalorieTarget:  profile.CalorieTarget,
		ProteinTargetG: profile.ProteinTargetG,
		CarbTargetG:    profile.CarbTargetG,
		FatTargetG:     profile.FatTargetG,
		WaterTargetMl:  profile.WaterTargetMl,
	}

	// Latest weight entry
	if latest, lErr := s.weightRepo.FindLatestByUserID(ctx, userID); lErr == nil {
		result.LatestWeight = &service.WeightPoint{
			LoggedAt: latest.LoggedAt,
			WeightKg: latest.WeightKg,
		}
	}

	// 90-day weight history
	to := time.Now().UTC().Truncate(24 * time.Hour)
	from := to.AddDate(0, 0, -89)
	entries, hErr := s.weightRepo.ListByUserIDInDateRange(ctx, userID, from, to)
	if hErr == nil {
		result.WeightHistory = make([]service.WeightPoint, 0, len(entries))
		for _, e := range entries {
			result.WeightHistory = append(result.WeightHistory, service.WeightPoint{
				LoggedAt: e.LoggedAt,
				WeightKg: e.WeightKg,
			})
		}
	}

	return result, nil
}

// computeBMI returns BMI rounded to 2 decimal places. Returns 0 if height is unknown.
func computeBMI(weightKg, heightCm float64) float64 {
	if heightCm <= 0 {
		return 0
	}
	heightM := heightCm / 100
	return math.Round(weightKg/math.Pow(heightM, 2)*100) / 100
}

func validateLogWeightMetricCommand(cmd service.LogWeightMetricCommand) error {
	if !entity.IsValidWeight(cmd.WeightKg) {
		return apperror.ErrValidation.WithMessage(
			fmt.Sprintf("Cân nặng phải trong khoảng %.0f–%.0f kg", entity.WeightMinKg, entity.WeightMaxKg),
		)
	}
	if cmd.LoggedAt.IsZero() {
		return apperror.ErrValidation.WithMessage("logged_at không được để trống")
	}
	// Must not be more than 1 day in the future
	tomorrow := time.Now().UTC().Add(24 * time.Hour).Truncate(24 * time.Hour)
	if cmd.LoggedAt.UTC().After(tomorrow) {
		return apperror.ErrValidation.WithMessage("logged_at không được là tương lai quá 1 ngày")
	}
	if len(cmd.Note) > entity.WeightNoteMaxLen {
		return apperror.ErrValidation.WithMessage(
			fmt.Sprintf("Ghi chú không được vượt quá %d ký tự", entity.WeightNoteMaxLen),
		)
	}
	return nil
}

// ensure compile-time interface satisfaction
var _ service.HealthMetricService = (*healthMetricServiceImpl)(nil)
