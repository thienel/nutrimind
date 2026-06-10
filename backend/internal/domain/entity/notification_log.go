package entity

import "time"

const (
	NotificationTypeReminder  = "reminder"
	NotificationTypeAIInsight = "ai_insight"
	NotificationTypeSocial    = "social"
	NotificationTypeSystem    = "system"
)

const (
	NotificationStatusDelivered = "delivered"
	NotificationStatusFailed    = "failed"
	NotificationStatusQueued    = "queued"
)

const MaxNotificationsPerUser = 10

// NotificationLog records a single push notification that was sent or attempted.
type NotificationLog struct {
	ID               uint       `gorm:"primaryKey;autoIncrement"`
	UserID           uint       `gorm:"not null;index"`
	NotificationType string     `gorm:"column:notification_type;not null"`
	Title            string     `gorm:"not null"`
	Body             string     `gorm:"not null"`
	DeepLink         *string    `gorm:"column:deep_link"`
	Status           string     `gorm:"not null"`
	RetryCount       int        `gorm:"column:retry_count;not null;default:0"`
	ScheduledAt      time.Time  `gorm:"column:scheduled_at;not null"`
	SentAt           *time.Time `gorm:"column:sent_at"`
	CreatedAt        time.Time
}
