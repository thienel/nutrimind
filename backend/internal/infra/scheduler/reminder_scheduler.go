package scheduler

import (
	"context"
	"fmt"
	"time"

	"github.com/thienel/tlog"
	"go.uber.org/zap"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/domain/repository"
	"nutrimind-backend/internal/infra/fcm"
)

const maxRetries = 3

// deep link payloads by reminder type
var deepLinks = map[string]string{
	entity.ReminderTypeWater:       "nutrimind://water/log",
	entity.ReminderTypeMeal:        "nutrimind://meal/log",
	entity.ReminderTypeDailyReview: "nutrimind://dashboard",
}

// defaultTitles by reminder type
var defaultTitles = map[string]string{
	entity.ReminderTypeWater:       "Uống nước nhé!",
	entity.ReminderTypeMeal:        "Đừng quên log bữa ăn!",
	entity.ReminderTypeDailyReview: "Xem lại ngày hôm nay",
}

// defaultBodies by reminder type
var defaultBodies = map[string]string{
	entity.ReminderTypeWater:       "Hãy uống một ly nước ngay bây giờ.",
	entity.ReminderTypeMeal:        "Hãy ghi lại những gì bạn vừa ăn.",
	entity.ReminderTypeDailyReview: "Xem tổng kết dinh dưỡng hôm nay của bạn.",
}

// ReminderScheduler runs every minute, checks reminder configs, and sends FCM notifications.
type ReminderScheduler struct {
	reminderRepo repository.ReminderConfigRepository
	deviceRepo   repository.UserDeviceRepository
	notifRepo    repository.NotificationLogRepository
	fcm          fcm.Sender
}

// New creates a new ReminderScheduler.
func New(
	reminderRepo repository.ReminderConfigRepository,
	deviceRepo repository.UserDeviceRepository,
	notifRepo repository.NotificationLogRepository,
	fcmSender fcm.Sender,
) *ReminderScheduler {
	return &ReminderScheduler{
		reminderRepo: reminderRepo,
		deviceRepo:   deviceRepo,
		notifRepo:    notifRepo,
		fcm:          fcmSender,
	}
}

// Start blocks and ticks every minute until ctx is cancelled.
func (s *ReminderScheduler) Start(ctx context.Context) {
	tlog.Info("Reminder scheduler started")

	// Align to the next whole minute.
	now := time.Now().UTC()
	nextTick := now.Truncate(time.Minute).Add(time.Minute)
	time.Sleep(time.Until(nextTick))

	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	// Run once immediately on the aligned minute, then on every tick.
	s.tick(ctx)

	for {
		select {
		case <-ticker.C:
			s.tick(ctx)
		case <-ctx.Done():
			tlog.Info("Reminder scheduler stopped")
			return
		}
	}
}

func (s *ReminderScheduler) tick(ctx context.Context) {
	now := time.Now().UTC()

	// 1. Process pending retries from previous failures.
	s.processRetries(ctx)

	// 2. Check all enabled reminder configs for this minute.
	configs, err := s.reminderRepo.FindAllEnabled(ctx)
	if err != nil {
		tlog.Error("scheduler: failed to load reminder configs", zap.Error(err))
		return
	}

	for i := range configs {
		cfg := &configs[i]
		if !shouldFire(cfg, now) {
			continue
		}
		s.sendReminder(ctx, cfg, now)
	}
}

// shouldFire returns true if the reminder should fire at the given time.
func shouldFire(cfg *entity.ReminderConfig, now time.Time) bool {
	nowHHMM := now.Format("15:04")

	if nowHHMM < cfg.WindowStart || nowHHMM > cfg.WindowEnd {
		return false
	}

	if len(cfg.SpecificTimes) > 0 {
		for i := range cfg.SpecificTimes {
			if cfg.SpecificTimes[i] == nowHHMM {
				return true
			}
		}
		return false
	}

	if cfg.FrequencyMin != nil && *cfg.FrequencyMin > 0 {
		windowMins := parseHHMM(cfg.WindowStart)
		nowMins := now.Hour()*60 + now.Minute()
		elapsed := nowMins - windowMins
		if elapsed < 0 {
			return false
		}
		return elapsed%*cfg.FrequencyMin == 0
	}

	return false
}

func (s *ReminderScheduler) sendReminder(ctx context.Context, cfg *entity.ReminderConfig, scheduledAt time.Time) {
	devices, err := s.deviceRepo.FindByUserID(ctx, cfg.UserID)
	if err != nil || len(devices) == 0 {
		return
	}

	title := defaultTitles[cfg.ReminderType]
	body := defaultBodies[cfg.ReminderType]
	if cfg.CustomMessage != nil && *cfg.CustomMessage != "" {
		body = *cfg.CustomMessage
	}
	deepLink := deepLinks[cfg.ReminderType]

	for _, device := range devices {
		s.dispatchAndLog(ctx, cfg.UserID, cfg.ReminderType, title, body, deepLink, device.FCMToken, scheduledAt)
	}
}

// dispatchAndLog sends one FCM message and writes a notification_log entry.
func (s *ReminderScheduler) dispatchAndLog(
	ctx context.Context,
	userID uint,
	reminderType, title, body, deepLink, token string,
	scheduledAt time.Time,
) {
	// Enforce max 10 notifications per user.
	count, err := s.notifRepo.CountByUserID(ctx, userID)
	if err == nil && count >= entity.MaxNotificationsPerUser {
		_ = s.notifRepo.DeleteOldestByUserID(ctx, userID)
	}

	log := &entity.NotificationLog{
		UserID:           userID,
		NotificationType: entity.NotificationTypeReminder,
		Title:            title,
		Body:             fmt.Sprintf("[%s] %s", reminderType, body),
		DeepLink:         &deepLink,
		Status:           entity.NotificationStatusQueued,
		RetryCount:       0,
		ScheduledAt:      scheduledAt,
	}
	if err := s.notifRepo.Create(ctx, log); err != nil {
		tlog.Error("scheduler: failed to create notification log", zap.Error(err))
		return
	}

	sendErr := s.fcm.Send(ctx, token, fcm.Message{
		Title:    title,
		Body:     body,
		DeepLink: deepLink,
	})

	status := entity.NotificationStatusDelivered
	if sendErr != nil {
		tlog.Warn("scheduler: FCM send failed", zap.Uint("userID", userID), zap.Error(sendErr))
		status = entity.NotificationStatusQueued
	}
	_ = s.notifRepo.UpdateStatus(ctx, log.ID, status, 0)
}

// processRetries retries queued notifications that are due.
func (s *ReminderScheduler) processRetries(ctx context.Context) {
	pending, err := s.notifRepo.FindPendingRetries(ctx, maxRetries)
	if err != nil || len(pending) == 0 {
		return
	}

	for i := range pending {
		log := &pending[i]

		devices, err := s.deviceRepo.FindByUserID(ctx, log.UserID)
		if err != nil || len(devices) == 0 {
			_ = s.notifRepo.UpdateStatus(ctx, log.ID, entity.NotificationStatusFailed, log.RetryCount+1)
			continue
		}

		sendErr := s.fcm.Send(ctx, devices[0].FCMToken, fcm.Message{
			Title:    log.Title,
			Body:     log.Body,
			DeepLink: ptrStr(log.DeepLink),
		})

		newCount := log.RetryCount + 1
		if sendErr != nil {
			status := entity.NotificationStatusQueued
			if newCount >= maxRetries {
				status = entity.NotificationStatusFailed
			}
			_ = s.notifRepo.UpdateStatus(ctx, log.ID, status, newCount)
		} else {
			_ = s.notifRepo.UpdateStatus(ctx, log.ID, entity.NotificationStatusDelivered, newCount)
		}
	}
}

func parseHHMM(hhmm string) int {
	if len(hhmm) != 5 {
		return 0
	}
	h := int(hhmm[0]-'0')*10 + int(hhmm[1]-'0')
	m := int(hhmm[3]-'0')*10 + int(hhmm[4]-'0')
	return h*60 + m
}

func ptrStr(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

