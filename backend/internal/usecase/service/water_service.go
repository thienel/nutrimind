package service

import (
	"context"
	"time"
)

// LogWaterCommand is the input for logging a water intake entry.
type LogWaterCommand struct {
	UserID          uint
	VolumeMl        int
	LoggedDate      time.Time
	ClientCreatedAt *time.Time
}

// WaterEntryResult is the output for a single water entry.
type WaterEntryResult struct {
	ID        uint
	VolumeMl  int
	CreatedAt time.Time
}

// WaterLogResult is the response after successfully logging a water entry.
type WaterLogResult struct {
	ID            uint
	VolumeMl      int
	LoggedDate    time.Time
	DailyTotalMl  int
	WaterTargetMl int
	CreatedAt     time.Time
}

// WaterDayResult holds all water entries for a single day plus summary fields.
type WaterDayResult struct {
	Date          time.Time
	Entries       []WaterEntryResult
	DailyTotalMl  int
	WaterTargetMl int
}

// WaterHistoryItem is one date's aggregated water intake.
type WaterHistoryItem struct {
	Date    time.Time
	TotalMl int
}

// WaterHistoryResult is the response for the date-range history endpoint.
type WaterHistoryResult struct {
	Items         []WaterHistoryItem
	WaterTargetMl int
}

// WaterService handles water intake tracking.
type WaterService interface {
	LogWater(ctx context.Context, cmd LogWaterCommand) (*WaterLogResult, error)
	GetWaterByDate(ctx context.Context, userID uint, date time.Time) (*WaterDayResult, error)
	GetWaterHistory(ctx context.Context, userID uint, from, to time.Time) (*WaterHistoryResult, error)
	DeleteWater(ctx context.Context, userID, entryID uint) error
}
