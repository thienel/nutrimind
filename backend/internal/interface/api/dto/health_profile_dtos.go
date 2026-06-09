package dto

import "time"

// CreateHealthProfileRequest represents the body for creating a health profile.
type CreateHealthProfileRequest struct {
	FullName      string  `json:"full_name" binding:"required"`
	Age           int     `json:"age" binding:"required,min=1,max=150"`
	Gender        string  `json:"gender" binding:"required,oneof=MALE FEMALE OTHER"`
	HeightCm      float64 `json:"height_cm" binding:"required,min=50,max=300"`
	WeightKg      float64 `json:"weight_kg" binding:"required,min=10,max=500"`
	Goal          string  `json:"goal" binding:"required,oneof=LOSE_WEIGHT MAINTAIN GAIN_MUSCLE IMPROVE_HEALTH"`
	ActivityLevel string  `json:"activity_level" binding:"required,oneof=SEDENTARY LIGHTLY_ACTIVE MODERATELY_ACTIVE VERY_ACTIVE EXTRA_ACTIVE"`
}

// HealthProfileResponse is the API response for a health profile.
type HealthProfileResponse struct {
	ID            uint      `json:"id"`
	UserID        uint      `json:"user_id"`
	FullName      string    `json:"full_name"`
	Age           int       `json:"age"`
	Gender        string    `json:"gender"`
	HeightCm      float64   `json:"height_cm"`
	WeightKg      float64   `json:"weight_kg"`
	Goal          string    `json:"goal"`
	ActivityLevel string    `json:"activity_level"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}
