package entity

import "time"

const (
	WeightMinKg = 15.0
	WeightMaxKg = 300.0
)

// WeightEntry records a user's weight measurement for a specific date.
// At most one entry per (user_id, date) – enforced by unique index.
type WeightEntry struct {
	ID        uint      `gorm:"primaryKey;autoIncrement"`
	UserID    uint      `gorm:"not null;index"`
	Date      time.Time `gorm:"not null;type:date"`
	WeightKg  float64   `gorm:"not null"`
	Note      string    `gorm:"size:500"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

// IsValidWeight reports whether the given weight is within the allowed range.
func IsValidWeight(kg float64) bool {
	return kg >= WeightMinKg && kg <= WeightMaxKg
}
