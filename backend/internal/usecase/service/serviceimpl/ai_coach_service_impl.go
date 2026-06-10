package serviceimpl

import (
	"context"
	"time"

	"nutrimind-backend/internal/domain/repository"
	"nutrimind-backend/internal/usecase/service"
	apperror "nutrimind-backend/pkg/error"
)

type aiCoachServiceImpl struct {
	profileRepo repository.HealthProfileRepository
	mealRepo    repository.MealEntryRepository
	waterRepo   repository.WaterEntryRepository
	advisor     service.NutritionAdvisor
}

// NewAICoachService creates a new AICoachService.
func NewAICoachService(
	profileRepo repository.HealthProfileRepository,
	mealRepo repository.MealEntryRepository,
	waterRepo repository.WaterEntryRepository,
	advisor service.NutritionAdvisor,
) service.AICoachService {
	return &aiCoachServiceImpl{
		profileRepo: profileRepo,
		mealRepo:    mealRepo,
		waterRepo:   waterRepo,
		advisor:     advisor,
	}
}

func (s *aiCoachServiceImpl) GetAdvice(ctx context.Context, cmd service.GetAdviceCommand) (*service.AdviceResult, error) {
	profile, err := s.profileRepo.FindByUserID(ctx, cmd.UserID)
	if err != nil {
		return nil, apperror.ErrOnboardingRequired.WithMessage("Vui lòng hoàn thành onboarding trước khi sử dụng AI Coach")
	}

	today := time.Now().UTC().Truncate(24 * time.Hour)

	meals, err := s.mealRepo.FindByUserIDAndDate(ctx, cmd.UserID, today)
	if err != nil {
		return nil, err
	}

	waterMl, err := s.waterRepo.SumByUserIDAndDate(ctx, cmd.UserID, today)
	if err != nil {
		return nil, err
	}

	var calLogged, proteinLogged, carbLogged, fatLogged float64
	for i := range meals {
		calLogged += meals[i].Calories
		proteinLogged += meals[i].ProteinG
		carbLogged += meals[i].CarbG
		fatLogged += meals[i].FatG
	}

	input := service.NutritionAdviceInput{
		Age:            profile.Age,
		Gender:         profile.Gender,
		WeightKg:       profile.WeightKg,
		HeightCm:       profile.HeightCm,
		Goal:           profile.Goal,
		ActivityLevel:  profile.ActivityLevel,
		CalorieTarget:  profile.CalorieTarget,
		ProteinTargetG: profile.ProteinTargetG,
		CarbTargetG:    profile.CarbTargetG,
		FatTargetG:     profile.FatTargetG,
		WaterTargetMl:  profile.WaterTargetMl,
		CaloriesLogged: round2(calLogged),
		ProteinLogged:  round2(proteinLogged),
		CarbLogged:     round2(carbLogged),
		FatLogged:      round2(fatLogged),
		WaterMlLogged:  waterMl,
		MealCount:      len(meals),
		UserPrompt:     cmd.Prompt,
	}

	result, err := s.advisor.GetDailyAdvice(ctx, input)
	if err != nil {
		return nil, apperror.ErrAIUnavailable.WithMessage("AI Coach tạm thời không khả dụng, vui lòng thử lại sau").WithError(err)
	}

	result.ContextSummary = service.AdviceContextSummary{
		CaloriesLogged: round2(calLogged),
		CalorieTarget:  profile.CalorieTarget,
		WaterMlLogged:  waterMl,
		WaterTargetMl:  profile.WaterTargetMl,
	}

	return result, nil
}

func (s *aiCoachServiceImpl) GetMealSuggestion(ctx context.Context, cmd service.GetMealSuggestionCommand) (*service.MealSuggestionResult, error) {
	profile, err := s.profileRepo.FindByUserID(ctx, cmd.UserID)
	if err != nil {
		return nil, apperror.ErrOnboardingRequired.WithMessage("Vui lòng hoàn thành onboarding trước khi sử dụng AI Coach")
	}

	today := time.Now().UTC().Truncate(24 * time.Hour)

	meals, err := s.mealRepo.FindByUserIDAndDate(ctx, cmd.UserID, today)
	if err != nil {
		return nil, err
	}

	var calLogged, proteinLogged, carbLogged, fatLogged float64
	for i := range meals {
		calLogged += meals[i].Calories
		proteinLogged += meals[i].ProteinG
		carbLogged += meals[i].CarbG
		fatLogged += meals[i].FatG
	}

	input := service.MealSuggestionInput{
		Goal:              profile.Goal,
		MealType:          cmd.MealType,
		RemainingCalories: round2(profile.CalorieTarget - calLogged),
		RemainingProteinG: round2(profile.ProteinTargetG - proteinLogged),
		RemainingCarbG:    round2(profile.CarbTargetG - carbLogged),
		RemainingFatG:     round2(profile.FatTargetG - fatLogged),
	}

	result, err := s.advisor.GetMealSuggestion(ctx, input)
	if err != nil {
		return nil, apperror.ErrAIUnavailable.WithMessage("AI Coach tạm thời không khả dụng, vui lòng thử lại sau").WithError(err)
	}

	return result, nil
}

// ensure compile-time interface satisfaction
var _ service.AICoachService = (*aiCoachServiceImpl)(nil)
