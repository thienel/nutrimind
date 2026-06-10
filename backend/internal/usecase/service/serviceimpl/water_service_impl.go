package serviceimpl

import (
	"context"
	"time"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/domain/repository"
	"nutrimind-backend/internal/usecase/service"
	apperror "nutrimind-backend/pkg/error"
)

type waterServiceImpl struct {
	waterRepo   repository.WaterEntryRepository
	profileRepo repository.HealthProfileRepository
	userRepo    repository.UserRepository
}

// NewWaterService creates a new WaterService.
func NewWaterService(
	waterRepo repository.WaterEntryRepository,
	profileRepo repository.HealthProfileRepository,
	userRepo repository.UserRepository,
) service.WaterService {
	return &waterServiceImpl{
		waterRepo:   waterRepo,
		profileRepo: profileRepo,
		userRepo:    userRepo,
	}
}

func (s *waterServiceImpl) LogWater(ctx context.Context, cmd service.LogWaterCommand) (*service.WaterLogResult, error) {
	if cmd.VolumeMl <= 0 {
		return nil, apperror.ErrValidation.WithMessage("Lượng nước phải lớn hơn 0")
	}
	if cmd.VolumeMl > 5000 {
		return nil, apperror.ErrValidation.WithMessage("Lượng nước không được vượt quá 5000ml mỗi lần")
	}
	if cmd.LoggedDate.IsZero() {
		return nil, apperror.ErrValidation.WithMessage("Ngày không được để trống")
	}

	loggedDate := cmd.LoggedDate.UTC().Truncate(24 * time.Hour)

	entry := &entity.WaterEntry{
		UserID:          cmd.UserID,
		VolumeMl:        cmd.VolumeMl,
		LoggedDate:      loggedDate,
		ClientCreatedAt: cmd.ClientCreatedAt,
	}

	if err := s.waterRepo.Create(ctx, entry); err != nil {
		return nil, err
	}

	_ = s.userRepo.UpdateLastActivityAt(ctx, cmd.UserID, time.Now())

	dailyTotal, err := s.waterRepo.SumByUserIDAndDate(ctx, cmd.UserID, loggedDate)
	if err != nil {
		return nil, err
	}

	waterTarget := s.getWaterTarget(ctx, cmd.UserID)

	return &service.WaterLogResult{
		ID:            entry.ID,
		VolumeMl:      entry.VolumeMl,
		LoggedDate:    entry.LoggedDate,
		DailyTotalMl:  dailyTotal,
		WaterTargetMl: waterTarget,
		CreatedAt:     entry.CreatedAt,
	}, nil
}

func (s *waterServiceImpl) GetWaterByDate(ctx context.Context, userID uint, date time.Time) (*service.WaterDayResult, error) {
	dateOnly := date.UTC().Truncate(24 * time.Hour)

	entries, err := s.waterRepo.FindByUserIDAndDate(ctx, userID, dateOnly)
	if err != nil {
		return nil, err
	}

	var dailyTotal int
	results := make([]service.WaterEntryResult, 0, len(entries))
	for i := range entries {
		e := &entries[i]
		dailyTotal += e.VolumeMl
		results = append(results, service.WaterEntryResult{
			ID:        e.ID,
			VolumeMl:  e.VolumeMl,
			CreatedAt: e.CreatedAt,
		})
	}

	waterTarget := s.getWaterTarget(ctx, userID)

	return &service.WaterDayResult{
		Date:          dateOnly,
		Entries:       results,
		DailyTotalMl:  dailyTotal,
		WaterTargetMl: waterTarget,
	}, nil
}

func (s *waterServiceImpl) GetWaterHistory(ctx context.Context, userID uint, from, to time.Time) (*service.WaterHistoryResult, error) {
	fromDate := from.UTC().Truncate(24 * time.Hour)
	toDate := to.UTC().Truncate(24 * time.Hour)

	summaries, err := s.waterRepo.ListDailySummaryByDateRange(ctx, userID, fromDate, toDate)
	if err != nil {
		return nil, err
	}

	// Build a lookup map for fast access
	sumMap := make(map[string]int, len(summaries))
	for _, s := range summaries {
		sumMap[s.LoggedDate.Format("2006-01-02")] = s.TotalMl
	}

	// Generate all dates in [from, to], filling missing ones with 0
	var items []service.WaterHistoryItem
	for d := fromDate; !d.After(toDate); d = d.AddDate(0, 0, 1) {
		key := d.Format("2006-01-02")
		items = append(items, service.WaterHistoryItem{
			Date:    d,
			TotalMl: sumMap[key],
		})
	}

	waterTarget := s.getWaterTarget(ctx, userID)

	return &service.WaterHistoryResult{
		Items:         items,
		WaterTargetMl: waterTarget,
	}, nil
}

func (s *waterServiceImpl) DeleteWater(ctx context.Context, userID, entryID uint) error {
	entry, err := s.waterRepo.FindByID(ctx, entryID)
	if err != nil {
		return err
	}
	if entry.UserID != userID {
		return apperror.ErrForbidden.WithMessage("Bạn không có quyền xóa bản ghi này")
	}
	return s.waterRepo.Delete(ctx, entryID)
}

// getWaterTarget returns the user's daily water target from their health profile.
// Returns 0 if the profile does not exist yet (fails open).
func (s *waterServiceImpl) getWaterTarget(ctx context.Context, userID uint) int {
	profile, err := s.profileRepo.FindByUserID(ctx, userID)
	if err != nil || profile == nil {
		return 0
	}
	return profile.WaterTargetMl
}

// ensure compile-time interface satisfaction
var _ service.WaterService = (*waterServiceImpl)(nil)
