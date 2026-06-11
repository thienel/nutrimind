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
	User              UserResponse `json:"user"`
	AppToken          string       `json:"app_token"`
	ExpiresIn         int          `json:"expires_in"`          // app token lifetime in seconds
	RefreshToken      string       `json:"refresh_token"`
	RefreshExpiresIn  int          `json:"refresh_expires_in"`  // refresh token lifetime in seconds
	IsFirstLogin      bool         `json:"is_first_login"`
}

// RefreshTokenRequest represents the token refresh request body
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// RefreshTokenResponse represents the new token pair after a successful refresh
type RefreshTokenResponse struct {
	AppToken         string `json:"app_token"`
	ExpiresIn        int    `json:"expires_in"`         // app token lifetime in seconds
	RefreshToken     string `json:"refresh_token"`
	RefreshExpiresIn int    `json:"refresh_expires_in"` // refresh token lifetime in seconds
}

// SignOutRequest represents the sign-out request body
type SignOutRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// EmailRegisterRequest represents the email/password registration request
type EmailRegisterRequest struct {
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=8"`
	DisplayName string `json:"display_name" binding:"required"`
}

// EmailLoginRequest represents the email/password login request
type EmailLoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// EmailAuthResponse is the unified response for email-based auth (register & login)
type EmailAuthResponse struct {
	User             UserResponse `json:"user"`
	AppToken         string       `json:"app_token"`
	ExpiresIn        int          `json:"expires_in"`
	RefreshToken     string       `json:"refresh_token"`
	RefreshExpiresIn int          `json:"refresh_expires_in"`
	IsFirstLogin     bool         `json:"is_first_login"`
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

// UserListResponse is a concrete type used only in swagger annotations for paginated user lists.
type UserListResponse struct {
	Items      []UserResponse `json:"items"`
	Total      int64          `json:"total"`
	Page       int            `json:"page"`
	Limit      int            `json:"limit"`
	TotalPages int            `json:"total_pages"`
}
