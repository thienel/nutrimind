package entity

import "time"

const (
	ReactionKeepGoing     = "keep_going"
	ReactionNiceJob       = "nice_job"
	ReactionGreatProgress = "great_progress"
)

const CheerRateLimit = 5

type CheerReaction struct {
	ID          uint      `gorm:"primaryKey;autoIncrement"`
	SenderID    uint      `gorm:"column:sender_id;not null;index"`
	RecipientID uint      `gorm:"column:recipient_id;not null;index"`
	Reaction    string    `gorm:"not null"`
	SentDate    time.Time `gorm:"column:sent_date;not null;type:date"`
	CreatedAt   time.Time
}
