package service

import (
	"context"

	"nutrimind-backend/internal/interface/api/dto"
)

// AuthService defines authentication service interface
type AuthService interface {
	// GoogleSignIn verifies a Google ID token and returns a signed app token + refresh token.
	// Returns IsFirstLogin=true if this is the user's first sign-in.
	GoogleSignIn(ctx context.Context, idToken string) (*dto.GoogleSignInResponse, error)
	// Register creates a new account with email + password and returns a token pair.
	Register(ctx context.Context, email, password, displayName string) (*dto.EmailAuthResponse, error)
	// EmailLogin validates email + password credentials and returns a token pair.
	EmailLogin(ctx context.Context, email, password string) (*dto.EmailAuthResponse, error)
	// RefreshToken validates a refresh token and issues a new token pair (token rotation).
	RefreshToken(ctx context.Context, refreshToken string) (*dto.RefreshTokenResponse, error)
	// SignOut invalidates the provided refresh token so it cannot be used for silent re-auth.
	SignOut(ctx context.Context, refreshToken string) error
}

