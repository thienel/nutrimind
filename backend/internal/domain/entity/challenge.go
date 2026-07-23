package entity

import "time"

const (
	ChallengeTypeHydration   = "hydration"
	ChallengeTypeCalorieGoal = "calorie_goal"
)

const (
	EnrollmentStatusActive    = "active"
	EnrollmentStatusCompleted = "completed"
	EnrollmentStatusAbandoned = "abandoned"
)

type Challenge struct {
	ID           uint   `gorm:"primaryKey;autoIncrement"`
	Name         string `gorm:"not null"`
	Type         string `gorm:"not null"`
	DurationDays int    `gorm:"column:duration_days;not null"`
	Description  string `gorm:"not null"`
	CreatedAt    time.Time
}

type ChallengeEnrollment struct {
	ID           uint      `gorm:"primaryKey;autoIncrement"`
	UserID       uint      `gorm:"column:user_id;not null;index"`
	ChallengeID  uint      `gorm:"column:challenge_id;not null;index"`
	StartDate    time.Time `gorm:"column:start_date;not null;type:date"`
	EndDate      time.Time `gorm:"column:end_date;not null;type:date"`
	Status       string    `gorm:"not null;default:active"`
	BadgeAwarded bool      `gorm:"column:badge_awarded;not null;default:false"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type ChallengeDailyCompletion struct {
	ID             uint      `gorm:"primaryKey;autoIncrement"`
	EnrollmentID   uint      `gorm:"column:enrollment_id;not null;index"`
	CompletionDate time.Time `gorm:"column:completion_date;not null;type:date"`
	MetGoal        bool      `gorm:"column:met_goal;not null"`
	CreatedAt      time.Time
}
