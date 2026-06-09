package dto

import "time"

// LogWeightRequest is the request body for POST /weight-entries.
type LogWeightRequest struct {
	// Date in YYYY-MM-DD format; defaults to today if omitted.
	Date     string  `json:"date"`
	WeightKg float64 `json:"weight_kg" binding:"required,min=15,max=300"`
	Note     string  `json:"note" binding:"max=500"`
}

// WeightEntryResponse is the API response for a single weight entry.
type WeightEntryResponse struct {
	ID        uint      `json:"id"`
	UserID    uint      `json:"user_id"`
	Date      string    `json:"date"` // YYYY-MM-DD
	WeightKg  float64   `json:"weight_kg"`
	Note      string    `json:"note,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// WeightHistoryResponse wraps a paginated list of weight entries.
type WeightHistoryResponse struct {
	Entries  []WeightEntryResponse `json:"entries"`
	Total    int64                 `json:"total"`
	Page     int                   `json:"page"`
	PageSize int                   `json:"page_size"`
}
