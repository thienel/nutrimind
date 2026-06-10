package service

import (
	"context"
	"time"
)

// --- Commands & Results ---

type RegisterFCMTokenCommand struct {
	UserID   uint
	FCMToken string
	Platform string // android | ios
}

type ReminderConfigResult struct {
	ID            uint
	ReminderType  string
	Enabled       bool
	FrequencyMin  *int
	SpecificTimes []string
	WindowStart   string
	WindowEnd     string
	CustomMessage *string
}

type UpsertReminderCommand struct {
	UserID        uint
	ReminderType  string // water | meal | daily_review
	Enabled       bool
	FrequencyMin  *int
	SpecificTimes []string
	WindowStart   string
	WindowEnd     string
	CustomMessage *string
}

type NotificationLogResult struct {
	ID               uint
	NotificationType string
	Title            string
	Body             string
	DeepLink         *string
	Status           string
	ScheduledAt      time.Time
	SentAt           *time.Time
}

type ListNotificationsResult struct {
	Items  []NotificationLogResult
	Total  int64
	Limit  int
	Offset int
}

// --- Service interface ---

type NotificationService interface {
	RegisterFCMToken(ctx context.Context, cmd RegisterFCMTokenCommand) error
	GetReminders(ctx context.Context, userID uint) ([]ReminderConfigResult, error)
	UpsertReminder(ctx context.Context, cmd UpsertReminderCommand) (*ReminderConfigResult, error)
	ListNotifications(ctx context.Context, userID uint, offset, limit int) (*ListNotificationsResult, error)
}
