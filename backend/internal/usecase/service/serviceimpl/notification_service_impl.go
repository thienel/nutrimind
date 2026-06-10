package serviceimpl

import (
	"context"
	"fmt"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/domain/repository"
	"nutrimind-backend/internal/usecase/service"
	apperror "nutrimind-backend/pkg/error"
)

type notificationServiceImpl struct {
	deviceRepo   repository.UserDeviceRepository
	reminderRepo repository.ReminderConfigRepository
	notifRepo    repository.NotificationLogRepository
}

// NewNotificationService creates a new NotificationService.
func NewNotificationService(
	deviceRepo repository.UserDeviceRepository,
	reminderRepo repository.ReminderConfigRepository,
	notifRepo repository.NotificationLogRepository,
) service.NotificationService {
	return &notificationServiceImpl{
		deviceRepo:   deviceRepo,
		reminderRepo: reminderRepo,
		notifRepo:    notifRepo,
	}
}

func (s *notificationServiceImpl) RegisterFCMToken(ctx context.Context, cmd service.RegisterFCMTokenCommand) error {
	if cmd.FCMToken == "" {
		return apperror.ErrValidation.WithMessage("FCM token không được để trống")
	}
	if cmd.Platform != entity.PlatformAndroid && cmd.Platform != entity.PlatformIOS {
		return apperror.ErrValidation.WithMessage("platform phải là 'android' hoặc 'ios'")
	}

	device := &entity.UserDevice{
		UserID:   cmd.UserID,
		FCMToken: cmd.FCMToken,
		Platform: cmd.Platform,
	}
	return s.deviceRepo.UpsertByUserAndPlatform(ctx, device)
}

func (s *notificationServiceImpl) GetReminders(ctx context.Context, userID uint) ([]service.ReminderConfigResult, error) {
	configs, err := s.reminderRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	results := make([]service.ReminderConfigResult, 0, len(configs))
	for i := range configs {
		results = append(results, toReminderConfigResult(&configs[i]))
	}
	return results, nil
}

func (s *notificationServiceImpl) UpsertReminder(ctx context.Context, cmd service.UpsertReminderCommand) (*service.ReminderConfigResult, error) {
	if !entity.IsValidReminderType(cmd.ReminderType) {
		return nil, apperror.ErrValidation.WithMessage("reminder_type không hợp lệ: water, meal, hoặc daily_review")
	}
	if cmd.FrequencyMin != nil && len(cmd.SpecificTimes) > 0 {
		return nil, apperror.ErrValidation.WithMessage("Chỉ được dùng một trong hai: frequency_min hoặc specific_times")
	}
	if err := validateHHMM(cmd.WindowStart); err != nil {
		return nil, apperror.ErrValidation.WithMessage("window_start " + err.Error())
	}
	if err := validateHHMM(cmd.WindowEnd); err != nil {
		return nil, apperror.ErrValidation.WithMessage("window_end " + err.Error())
	}
	if cmd.WindowStart >= cmd.WindowEnd {
		return nil, apperror.ErrValidation.WithMessage("window_start phải nhỏ hơn window_end")
	}

	config := &entity.ReminderConfig{
		UserID:        cmd.UserID,
		ReminderType:  cmd.ReminderType,
		Enabled:       cmd.Enabled,
		FrequencyMin:  cmd.FrequencyMin,
		SpecificTimes: entity.StringSlice(cmd.SpecificTimes),
		WindowStart:   cmd.WindowStart,
		WindowEnd:     cmd.WindowEnd,
		CustomMessage: cmd.CustomMessage,
	}

	if err := s.reminderRepo.UpsertByUserAndType(ctx, config); err != nil {
		return nil, err
	}

	result := toReminderConfigResult(config)
	return &result, nil
}

func (s *notificationServiceImpl) ListNotifications(ctx context.Context, userID uint, offset, limit int) (*service.ListNotificationsResult, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}

	logs, total, err := s.notifRepo.ListByUserID(ctx, userID, offset, limit)
	if err != nil {
		return nil, err
	}

	items := make([]service.NotificationLogResult, 0, len(logs))
	for i := range logs {
		l := &logs[i]
		items = append(items, service.NotificationLogResult{
			ID:               l.ID,
			NotificationType: l.NotificationType,
			Title:            l.Title,
			Body:             l.Body,
			DeepLink:         l.DeepLink,
			Status:           l.Status,
			ScheduledAt:      l.ScheduledAt,
			SentAt:           l.SentAt,
		})
	}

	return &service.ListNotificationsResult{
		Items:  items,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}, nil
}

func toReminderConfigResult(c *entity.ReminderConfig) service.ReminderConfigResult {
	return service.ReminderConfigResult{
		ID:            c.ID,
		ReminderType:  c.ReminderType,
		Enabled:       c.Enabled,
		FrequencyMin:  c.FrequencyMin,
		SpecificTimes: []string(c.SpecificTimes),
		WindowStart:   c.WindowStart,
		WindowEnd:     c.WindowEnd,
		CustomMessage: c.CustomMessage,
	}
}

func validateHHMM(s string) error {
	if len(s) != 5 || s[2] != ':' {
		return fmt.Errorf("không hợp lệ, dùng định dạng HH:MM")
	}
	for i, c := range s {
		if i == 2 {
			continue
		}
		if c < '0' || c > '9' {
			return fmt.Errorf("không hợp lệ, dùng định dạng HH:MM")
		}
	}
	return nil
}

var _ service.NotificationService = (*notificationServiceImpl)(nil)
