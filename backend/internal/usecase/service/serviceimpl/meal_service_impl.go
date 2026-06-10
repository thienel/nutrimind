package serviceimpl

import (
	"context"
	"crypto/sha256"
	"fmt"
	"time"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/domain/repository"
	"nutrimind-backend/internal/usecase/service"
	apperror "nutrimind-backend/pkg/error"
)

const mealDupTTL = 5 * time.Second

type mealServiceImpl struct {
	mealRepo   repository.MealEntryRepository
	dupChecker service.MealDupChecker
	aiAnalyzer service.FoodPhotoAnalyzer
	userRepo   repository.UserRepository
}

// NewMealService creates a new MealService.
func NewMealService(
	mealRepo repository.MealEntryRepository,
	dupChecker service.MealDupChecker,
	aiAnalyzer service.FoodPhotoAnalyzer,
	userRepo repository.UserRepository,
) service.MealService {
	return &mealServiceImpl{
		mealRepo:   mealRepo,
		dupChecker: dupChecker,
		aiAnalyzer: aiAnalyzer,
		userRepo:   userRepo,
	}
}

func (s *mealServiceImpl) LogMeal(ctx context.Context, cmd service.LogMealCommand) (*service.MealEntryResult, error) {
	if err := validateLogMealCommand(cmd); err != nil {
		return nil, err
	}

	loggedDate := cmd.LoggedDate.UTC().Truncate(24 * time.Hour)

	dupKey := mealDupKey(cmd.UserID, cmd.FoodName, cmd.MealType, loggedDate, cmd.Calories)
	isDup, _ := s.dupChecker.CheckAndMark(ctx, dupKey, mealDupTTL)
	if isDup {
		return nil, apperror.ErrDuplicateEntry.WithMessage("Yêu cầu trùng lặp, vui lòng thử lại sau")
	}

	entry := &entity.MealEntry{
		UserID:          cmd.UserID,
		FoodName:        cmd.FoodName,
		MealType:        cmd.MealType,
		Calories:        cmd.Calories,
		ProteinG:        cmd.ProteinG,
		CarbG:           cmd.CarbG,
		FatG:            cmd.FatG,
		Source:          cmd.Source,
		AIConfidence:    cmd.AIConfidence,
		LoggedDate:      loggedDate,
		ClientCreatedAt: cmd.ClientCreatedAt,
	}

	if err := s.mealRepo.Create(ctx, entry); err != nil {
		return nil, err
	}

	_ = s.userRepo.UpdateLastActivityAt(ctx, cmd.UserID, time.Now())

	return toMealEntryResult(entry), nil
}

func (s *mealServiceImpl) GetMealsByDate(ctx context.Context, userID uint, date time.Time) (*service.DailyMealsResult, error) {
	dateOnly := date.UTC().Truncate(24 * time.Hour)
	entries, err := s.mealRepo.FindByUserIDAndDate(ctx, userID, dateOnly)
	if err != nil {
		return nil, err
	}

	result := &service.DailyMealsResult{
		Date:      dateOnly,
		Breakfast: []service.MealEntryResult{},
		Lunch:     []service.MealEntryResult{},
		Dinner:    []service.MealEntryResult{},
		Snack:     []service.MealEntryResult{},
	}

	for i := range entries {
		e := &entries[i]
		r := *toMealEntryResult(e)
		switch e.MealType {
		case entity.MealTypeBreakfast:
			result.Breakfast = append(result.Breakfast, r)
		case entity.MealTypeLunch:
			result.Lunch = append(result.Lunch, r)
		case entity.MealTypeDinner:
			result.Dinner = append(result.Dinner, r)
		case entity.MealTypeSnack:
			result.Snack = append(result.Snack, r)
		}
		result.DailyTotals.Calories += e.Calories
		result.DailyTotals.ProteinG += e.ProteinG
		result.DailyTotals.CarbG += e.CarbG
		result.DailyTotals.FatG += e.FatG
	}

	result.DailyTotals.Calories = round2(result.DailyTotals.Calories)
	result.DailyTotals.ProteinG = round2(result.DailyTotals.ProteinG)
	result.DailyTotals.CarbG = round2(result.DailyTotals.CarbG)
	result.DailyTotals.FatG = round2(result.DailyTotals.FatG)

	return result, nil
}

func (s *mealServiceImpl) DeleteMeal(ctx context.Context, userID, mealID uint) error {
	meal, err := s.mealRepo.FindByID(ctx, mealID)
	if err != nil {
		return err
	}
	if meal.UserID != userID {
		return apperror.ErrForbidden.WithMessage("Bạn không có quyền xóa bữa ăn này")
	}
	return s.mealRepo.Delete(ctx, mealID)
}

func (s *mealServiceImpl) AnalyzePhoto(ctx context.Context, imageData []byte, mimeType string, description string) (*service.AIAnalysisResult, error) {
	result, err := s.aiAnalyzer.AnalyzeFood(ctx, imageData, mimeType, description)
	if err != nil {
		return nil, apperror.ErrAIUnavailable.WithMessage("AI phân tích ảnh tạm thời không khả dụng, vui lòng thử lại sau").WithError(err)
	}
	return result, nil
}

func toMealEntryResult(e *entity.MealEntry) *service.MealEntryResult {
	return &service.MealEntryResult{
		ID:         e.ID,
		FoodName:   e.FoodName,
		MealType:   e.MealType,
		Calories:   e.Calories,
		ProteinG:   e.ProteinG,
		CarbG:      e.CarbG,
		FatG:       e.FatG,
		Source:     e.Source,
		LoggedDate: e.LoggedDate,
		CreatedAt:  e.CreatedAt,
	}
}

func mealDupKey(userID uint, foodName, mealType string, loggedDate time.Time, calories float64) string {
	raw := fmt.Sprintf("%d:%s:%s:%s:%.2f", userID, foodName, mealType, loggedDate.Format("2006-01-02"), calories)
	h := sha256.Sum256([]byte(raw))
	return fmt.Sprintf("meal_dedup:%x", h)
}

func validateLogMealCommand(cmd service.LogMealCommand) error {
	if cmd.FoodName == "" {
		return apperror.ErrValidation.WithMessage("Tên món ăn không được để trống")
	}
	if len(cmd.FoodName) > entity.MealFoodNameMaxLen {
		return apperror.ErrValidation.WithMessage(fmt.Sprintf("Tên món ăn không được vượt quá %d ký tự", entity.MealFoodNameMaxLen))
	}
	if !entity.IsValidMealType(cmd.MealType) {
		return apperror.ErrValidation.WithMessage("Loại bữa ăn không hợp lệ: BREAKFAST, LUNCH, DINNER hoặc SNACK")
	}
	if cmd.Calories <= 0 {
		return apperror.ErrValidation.WithMessage("Calories phải lớn hơn 0")
	}
	if !entity.IsValidMealSource(cmd.Source) {
		return apperror.ErrValidation.WithMessage("Nguồn nhập liệu không hợp lệ: MANUAL hoặc AI_PHOTO")
	}
	if cmd.LoggedDate.IsZero() {
		return apperror.ErrValidation.WithMessage("Ngày không được để trống")
	}
	return nil
}

// ensure compile-time interface satisfaction
var _ service.MealService = (*mealServiceImpl)(nil)
