package dto

import "time"

// UserResponse represents a user in API responses
type UserResponse struct {
	ID          uint       `json:"id"`
	GoogleID    string     `json:"google_id"`
	Email       string     `json:"email"`
	DisplayName string     `json:"display_name"`
	PhotoURL    string     `json:"photo_url,omitempty"`
	Role        string     `json:"role"`
	Status      string     `json:"status"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty"`
}

// GoogleSignInRequest represents the Google OAuth sign-in request
type GoogleSignInRequest struct {
	IDToken string `json:"id_token" binding:"required"`
}

// GoogleSignInResponse represents the successful sign-in response
type GoogleSignInResponse struct {
	User         UserResponse `json:"user"`
	AppToken     string       `json:"app_token"`
	ExpiresIn    int          `json:"expires_in"` // seconds
	IsFirstLogin bool         `json:"is_first_login"`
}

// UpdateUserRequest represents user update request (admin)
type UpdateUserRequest struct {
	Role   string `json:"role,omitempty"`
	Status string `json:"status,omitempty"`
}

// ListResponse represents paginated list response
type ListResponse[T any] struct {
	Items      []T   `json:"items"`
	Total      int64 `json:"total"`
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	TotalPages int   `json:"total_pages"`
}
