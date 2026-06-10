package entity

import "time"

const (
	WeightMinKg     = 15.0
	WeightMaxKg     = 500.0
	WeightNoteMaxLen = 200
)

// WeightEntry records a user's weight measurement for a specific date.
// At most one entry per (user_id, logged_at) — upsert semantics.
type WeightEntry struct {
	ID              uint       `gorm:"primaryKey;autoIncrement"`
	UserID          uint       `gorm:"not null;index"`
	LoggedAt        time.Time  `gorm:"not null;type:date;column:logged_at"`
	WeightKg        float64    `gorm:"not null"`
	Note            string     `gorm:"size:200"`
	ClientCreatedAt *time.Time `gorm:"column:client_created_at"`
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

// IsValidWeight reports whether the given weight is within the allowed range.
func IsValidWeight(kg float64) bool {
	return kg >= WeightMinKg && kg <= WeightMaxKg
}
