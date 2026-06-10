package dto

import "time"

// LogWaterRequest is the body for POST /water.
type LogWaterRequest struct {
	VolumeMl        int        `json:"volume_ml"         binding:"required,gt=0,max=5000"`
	LoggedDate      string     `json:"logged_date"       binding:"required"`
	ClientCreatedAt *time.Time `json:"client_created_at"`
}

// WaterLogResponse is the body returned after a successful POST /water (201).
type WaterLogResponse struct {
	ID            uint      `json:"id"`
	VolumeMl      int       `json:"volume_ml"`
	LoggedDate    string    `json:"logged_date"`
	DailyTotalMl  int       `json:"daily_total_ml"`
	WaterTargetMl int       `json:"water_target_ml"`
	CreatedAt     time.Time `json:"created_at"`
}

// WaterEntryResponse is a single water entry inside GET /water response.
type WaterEntryResponse struct {
	ID        uint      `json:"id"`
	VolumeMl  int       `json:"volume_ml"`
	CreatedAt time.Time `json:"created_at"`
}

// WaterDayResponse is the body returned by GET /water?date=.
type WaterDayResponse struct {
	Date          string               `json:"date"`
	Entries       []WaterEntryResponse `json:"entries"`
	DailyTotalMl  int                  `json:"daily_total_ml"`
	WaterTargetMl int                  `json:"water_target_ml"`
}

// WaterHistoryItemResponse is one date in the GET /water/history response.
type WaterHistoryItemResponse struct {
	Date    string `json:"date"`
	TotalMl int    `json:"total_ml"`
}

// WaterHistoryResponse is the body returned by GET /water/history.
type WaterHistoryResponse struct {
	Items         []WaterHistoryItemResponse `json:"items"`
	WaterTargetMl int                        `json:"water_target_ml"`
}
