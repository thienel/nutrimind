package service

import (
	"time"

	"nutrimind-backend/internal/domain/valueobject"
)

// JWTService defines JWT operations
type JWTService interface {
	// GenerateAppToken generates a short-lived app token (30 days per SRS §6.7)
	GenerateAppToken(userID uint, googleID, role string) (string, error)
	// GenerateRefreshToken generates a long-lived refresh token (90 days)
	GenerateRefreshToken(userID uint, googleID, role string) (string, error)
	// ValidateToken validates a JWT app token and returns claims
	ValidateToken(tokenString string) (*valueobject.JWTClaims, error)
	// ValidateRefreshToken validates a refresh JWT and returns claims
	ValidateRefreshToken(tokenString string) (*valueobject.JWTClaims, error)
	// GetRefreshTokenExpiry parses a refresh token and returns its expiry time.
	// Returns an error if the token is invalid or already expired.
	GetRefreshTokenExpiry(tokenString string) (time.Time, error)
	// GetAppExpirySeconds returns the app token expiry in seconds
	GetAppExpirySeconds() int
	// GetRefreshExpirySeconds returns the refresh token expiry in seconds
	GetRefreshExpirySeconds() int
}
