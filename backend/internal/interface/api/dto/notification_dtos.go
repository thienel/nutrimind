package dto

import "time"

// RegisterFCMTokenRequest is the body for POST /notifications/fcm-token.
type RegisterFCMTokenRequest struct {
	FCMToken string `json:"fcm_token" binding:"required"`
	Platform string `json:"platform"  binding:"required,oneof=android ios"`
}

// ReminderConfigResponse is a single reminder config in GET /reminders.
type ReminderConfigResponse struct {
	ID            uint     `json:"id"`
	ReminderType  string   `json:"reminder_type"`
	Enabled       bool     `json:"enabled"`
	FrequencyMin  *int     `json:"frequency_min"`
	SpecificTimes []string `json:"specific_times"`
	WindowStart   string   `json:"window_start"`
	WindowEnd     string   `json:"window_end"`
	CustomMessage *string  `json:"custom_message"`
}

// GetRemindersResponse is the body returned by GET /reminders.
type GetRemindersResponse struct {
	Reminders []ReminderConfigResponse `json:"reminders"`
}

// UpsertReminderRequest is the body for PUT /reminders/:type.
type UpsertReminderRequest struct {
	Enabled       bool     `json:"enabled"`
	FrequencyMin  *int     `json:"frequency_min"`
	SpecificTimes []string `json:"specific_times"`
	WindowStart   string   `json:"window_start"   binding:"required"`
	WindowEnd     string   `json:"window_end"     binding:"required"`
	CustomMessage *string  `json:"custom_message"`
}

// NotificationLogResponse is one item in GET /notifications.
type NotificationLogResponse struct {
	ID               uint       `json:"id"`
	NotificationType string     `json:"notification_type"`
	Title            string     `json:"title"`
	Body             string     `json:"body"`
	DeepLink         *string    `json:"deep_link"`
	Status           string     `json:"status"`
	ScheduledAt      time.Time  `json:"scheduled_at"`
	SentAt           *time.Time `json:"sent_at"`
}

// ListNotificationsResponse is the body returned by GET /notifications.
type ListNotificationsResponse struct {
	Items  []NotificationLogResponse `json:"items"`
	Total  int64                     `json:"total"`
	Limit  int                       `json:"limit"`
	Offset int                       `json:"offset"`
}
