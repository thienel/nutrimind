package service

import "nutrimind-backend/internal/domain/valueobject"

// JWTService defines JWT operations
type JWTService interface {
	// GenerateAppToken generates a long-lived app token (30 days per SRS §6.7)
	GenerateAppToken(userID uint, googleID, role string) (string, error)
	// ValidateToken validates a JWT token and returns claims
	ValidateToken(tokenString string) (*valueobject.JWTClaims, error)
	// GetAppExpirySeconds returns the app token expiry in seconds
	GetAppExpirySeconds() int
}
