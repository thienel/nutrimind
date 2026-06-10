package entity

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

const (
	ReminderTypeWater       = "water"
	ReminderTypeMeal        = "meal"
	ReminderTypeDailyReview = "daily_review"
)

// StringSlice is a []string that serializes to/from JSON text for DB storage.
type StringSlice []string

func (s StringSlice) Value() (driver.Value, error) {
	if s == nil {
		return nil, nil
	}
	b, err := json.Marshal([]string(s))
	if err != nil {
		return nil, err
	}
	return string(b), nil
}

func (s *StringSlice) Scan(value any) error {
	if value == nil {
		*s = nil
		return nil
	}
	var str string
	switch v := value.(type) { //nolint:gocritic
	case string:
		str = v
	case []byte:
		str = string(v)
	default:
		return fmt.Errorf("StringSlice.Scan: unsupported type %T", v)
	}
	return json.Unmarshal([]byte(str), s)
}

// ReminderConfig stores a user's push notification schedule for one reminder type.
// UNIQUE constraint: (user_id, reminder_type)
type ReminderConfig struct {
	ID            uint        `gorm:"primaryKey;autoIncrement"`
	UserID        uint        `gorm:"not null;index"`
	ReminderType  string      `gorm:"column:reminder_type;not null"`
	Enabled       bool        `gorm:"not null;default:true"`
	FrequencyMin  *int        `gorm:"column:frequency_min"`
	SpecificTimes StringSlice `gorm:"column:specific_times;type:text"`
	WindowStart   string      `gorm:"column:window_start;type:varchar(5);not null;default:'07:00'"`
	WindowEnd     string      `gorm:"column:window_end;type:varchar(5);not null;default:'22:00'"`
	CustomMessage *string     `gorm:"column:custom_message"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func IsValidReminderType(t string) bool {
	switch t {
	case ReminderTypeWater, ReminderTypeMeal, ReminderTypeDailyReview:
		return true
	}
	return false
}
