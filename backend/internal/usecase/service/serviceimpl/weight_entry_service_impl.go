package serviceimpl

import (
	"context"
	"fmt"
	"time"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/domain/repository"
	"nutrimind-backend/internal/usecase/service"
	apperror "nutrimind-backend/pkg/error"
)

type weightEntryServiceImpl struct {
	weightRepo repository.WeightEntryRepository
}

// NewWeightEntryService creates a new WeightEntryService.
func NewWeightEntryService(weightRepo repository.WeightEntryRepository) service.WeightEntryService {
	return &weightEntryServiceImpl{weightRepo: weightRepo}
}

// LogWeight validates and persists a weight measurement for the given date.
// If an entry already exists for that (user, date) pair, it is overwritten.
func (s *weightEntryServiceImpl) LogWeight(ctx context.Context, cmd service.LogWeightCommand) (*entity.WeightEntry, error) {
	// --- Validation ---
	if err := validateLogWeightCommand(cmd); err != nil {
		return nil, err
	}

	dateOnly := cmd.Date.UTC().Truncate(24 * time.Hour)

	// --- Upsert semantics: update if exists, create otherwise ---
	existing, err := s.weightRepo.FindByUserIDAndDate(ctx, cmd.UserID, dateOnly)
	if err == nil && existing != nil {
		// Entry found → update in place
		existing.WeightKg = cmd.WeightKg
		existing.Note = cmd.Note
		if updateErr := s.weightRepo.Update(ctx, existing); updateErr != nil {
			return nil, fmt.Errorf("update weight entry: %w", updateErr)
		}
		return existing, nil
	}

	// Entry not found → create new
	entry := &entity.WeightEntry{
		UserID:   cmd.UserID,
		Date:     dateOnly,
		WeightKg: cmd.WeightKg,
		Note:     cmd.Note,
	}
	if createErr := s.weightRepo.Create(ctx, entry); createErr != nil {
		return nil, fmt.Errorf("create weight entry: %w", createErr)
	}
	return entry, nil
}

// GetWeightHistory returns paginated weight history for a user, newest first.
func (s *weightEntryServiceImpl) GetWeightHistory(ctx context.Context, userID uint, page, pageSize int) ([]entity.WeightEntry, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	entries, total, err := s.weightRepo.ListByUserID(ctx, userID, offset, pageSize)
	if err != nil {
		return nil, 0, fmt.Errorf("list weight history: %w", err)
	}
	return entries, total, nil
}

// GetWeightByDate returns the entry for a specific date.
func (s *weightEntryServiceImpl) GetWeightByDate(ctx context.Context, userID uint, date time.Time) (*entity.WeightEntry, error) {
	dateOnly := date.UTC().Truncate(24 * time.Hour)
	entry, err := s.weightRepo.FindByUserIDAndDate(ctx, userID, dateOnly)
	if err != nil {
		return nil, apperror.ErrNotFound.WithMessage("Không có bản ghi cân nặng cho ngày này")
	}
	return entry, nil
}

// DeleteWeightEntry removes a weight entry, verifying ownership first.
func (s *weightEntryServiceImpl) DeleteWeightEntry(ctx context.Context, userID uint, entryID uint) error {
	entry, err := s.weightRepo.FindByID(ctx, entryID)
	if err != nil {
		return apperror.ErrNotFound.WithMessage("Không tìm thấy bản ghi cân nặng")
	}
	if entry.UserID != userID {
		return apperror.ErrForbidden.WithMessage("Bạn không có quyền xoá bản ghi này")
	}
	if err := s.weightRepo.Delete(ctx, entryID); err != nil {
		return fmt.Errorf("delete weight entry: %w", err)
	}
	return nil
}

// validateLogWeightCommand validates business rules for logging weight.
func validateLogWeightCommand(cmd service.LogWeightCommand) error {
	if cmd.UserID == 0 {
		return apperror.ErrBadRequest.WithMessage("userID không hợp lệ")
	}
	if cmd.Date.IsZero() {
		return apperror.ErrBadRequest.WithMessage("ngày không được để trống")
	}
	if !entity.IsValidWeight(cmd.WeightKg) {
		return apperror.ErrBadRequest.WithMessage(
			fmt.Sprintf("cân nặng phải trong khoảng %.0f–%.0f kg", entity.WeightMinKg, entity.WeightMaxKg),
		)
	}
	if len(cmd.Note) > 500 {
		return apperror.ErrBadRequest.WithMessage("ghi chú không được vượt quá 500 ký tự")
	}
	return nil
}

// ensure compile-time interface satisfaction
var _ service.WeightEntryService = (*weightEntryServiceImpl)(nil)
