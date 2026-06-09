package service

import (
	"context"

	"nutrimind-backend/internal/domain/entity"
)

// HealthProfileService defines use cases for health profile management.
type HealthProfileService interface {
	// CreateProfile creates a new health profile for a user.
	// Returns ErrConflict if the user already has a profile.
	CreateProfile(ctx context.Context, cmd CreateHealthProfileCommand) (*entity.HealthProfile, error)

	// GetProfileByUserID returns the health profile of the specified user.
	GetProfileByUserID(ctx context.Context, userID uint) (*entity.HealthProfile, error)
}

// CreateHealthProfileCommand holds all data required to create a health profile.
type CreateHealthProfileCommand struct {
	UserID        uint
	FullName      string
	Age           int
	Gender        string
	HeightCm      float64
	WeightKg      float64
	Goal          string
	ActivityLevel string
}
