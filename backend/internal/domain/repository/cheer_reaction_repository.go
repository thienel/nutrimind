package repository

import (
	"context"
	"time"

	"nutrimind-backend/internal/domain/entity"
)

// CheerReactionRepository handles persistence of CheerReaction records.
type CheerReactionRepository interface {
	BaseRepository[entity.CheerReaction]

	// CountSentToday returns how many reactions senderID sent to recipientID on date.
	CountSentToday(ctx context.Context, senderID, recipientID uint, date time.Time) (int64, error)

	// FindLatestSentToday returns the latest reaction senderID sent to recipientID on date, or nil.
	FindLatestSentToday(ctx context.Context, senderID, recipientID uint, date time.Time) (*entity.CheerReaction, error)

	// CountReceivedToday returns total reactions recipientID received on date.
	CountReceivedToday(ctx context.Context, recipientID uint, date time.Time) (int64, error)

	// FindSentTodayBulk returns all cheers senderID sent today to any of recipientIDs.
	FindSentTodayBulk(ctx context.Context, senderID uint, recipientIDs []uint, date time.Time) ([]entity.CheerReaction, error)

	// CountReceivedTodayBulk returns cheer counts received today for each of recipientIDs.
	CountReceivedTodayBulk(ctx context.Context, recipientIDs []uint, date time.Time) (map[uint]int64, error)
}
