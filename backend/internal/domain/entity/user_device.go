package entity

import "time"

const (
	PlatformAndroid = "android"
	PlatformIOS     = "ios"
)

// UserDevice stores an FCM push token for one of a user's devices.
// UNIQUE constraint: (user_id, platform) — each user has at most one token per platform.
type UserDevice struct {
	ID        uint      `gorm:"primaryKey;autoIncrement"`
	UserID    uint      `gorm:"not null;index"`
	FCMToken  string    `gorm:"column:fcm_token;not null"`
	Platform  string    `gorm:"not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
}
