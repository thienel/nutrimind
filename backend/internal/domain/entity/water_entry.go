package entity

import "time"

// WaterEntry records a single water intake event for a user.
type WaterEntry struct {
	ID              uint       `gorm:"primaryKey;autoIncrement"`
	UserID          uint       `gorm:"not null;index"`
	VolumeMl        int        `gorm:"column:volume_ml;not null"`
	LoggedDate      time.Time  `gorm:"column:logged_date;not null;type:date"`
	ClientCreatedAt *time.Time `gorm:"column:client_created_at"`
	CreatedAt       time.Time
}
