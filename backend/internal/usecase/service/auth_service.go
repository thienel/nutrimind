package service

import (
	"context"

	"nutrimind-backend/internal/interface/api/dto"
)

// AuthService defines authentication service interface
type AuthService interface {
	// GoogleSignIn verifies a Google ID token and returns a signed app token.
	// Returns IsFirstLogin=true if this is the user's first sign-in.
	GoogleSignIn(ctx context.Context, idToken string) (*dto.GoogleSignInResponse, error)
}
