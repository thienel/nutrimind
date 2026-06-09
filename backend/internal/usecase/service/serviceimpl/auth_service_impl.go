package serviceimpl

import (
	"context"
	"errors"
	"fmt"

	"github.com/thienel/tlog"
	"go.uber.org/zap"
	"google.golang.org/api/idtoken"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/domain/repository"
	"nutrimind-backend/internal/interface/api/dto"
	"nutrimind-backend/internal/usecase/service"
	apperror "nutrimind-backend/pkg/error"
	"nutrimind-backend/pkg/tokenstore"
)

type authServiceImpl struct {
	userRepo        repository.UserRepository
	jwtService      service.JWTService
	tokenBlacklist  tokenstore.Store
	googleClientIDs []string
}

// NewAuthService creates a new auth service.
// googleClientIDs accepts Web and/or iOS Client IDs — token audience is matched against each.
func NewAuthService(
	userRepo repository.UserRepository,
	jwtService service.JWTService,
	tokenBlacklist tokenstore.Store,
	googleClientIDs ...string,
) service.AuthService {
	ids := make([]string, 0, len(googleClientIDs))
	for _, id := range googleClientIDs {
		if id != "" {
			ids = append(ids, id)
		}
	}
	return &authServiceImpl{
		userRepo:        userRepo,
		jwtService:      jwtService,
		tokenBlacklist:  tokenBlacklist,
		googleClientIDs: ids,
	}
}

// validateGoogleToken tries each configured client ID until one validates successfully.
// This is necessary because Android tokens use the Web Client ID as audience while
// iOS tokens use the iOS Client ID.
func (s *authServiceImpl) validateGoogleToken(ctx context.Context, idToken string) (*idtoken.Payload, error) {
	var lastErr error
	for _, clientID := range s.googleClientIDs {
		payload, err := idtoken.Validate(ctx, idToken, clientID)
		if err == nil {
			return payload, nil
		}
		lastErr = err
	}
	if lastErr != nil {
		return nil, lastErr
	}
	return nil, errors.New("no google client IDs configured")
}

// generateTokenPair generates both an app token and a refresh token for a user.
func (s *authServiceImpl) generateTokenPair(user *entity.User) (appToken, refreshToken string, err error) {
	appToken, err = s.jwtService.GenerateAppToken(user.ID, user.GoogleID, user.Role)
	if err != nil {
		return "", "", fmt.Errorf("generate app token: %w", err)
	}
	refreshToken, err = s.jwtService.GenerateRefreshToken(user.ID, user.GoogleID, user.Role)
	if err != nil {
		return "", "", fmt.Errorf("generate refresh token: %w", err)
	}
	return appToken, refreshToken, nil
}

// GoogleSignIn verifies a Google ID token, creates or finds the user, and returns a signed token pair.
func (s *authServiceImpl) GoogleSignIn(ctx context.Context, idToken string) (*dto.GoogleSignInResponse, error) {
	// 1. Verify Google ID token with Google's public keys
	payload, err := s.validateGoogleToken(ctx, idToken)
	if err != nil {
		tlog.Debug("Google ID token validation failed", zap.Error(err))
		return nil, apperror.ErrUnauthorized.WithMessage("Google token không hợp lệ").WithError(err)
	}

	// 2. Extract claims from verified token
	googleID := payload.Subject
	email, _ := payload.Claims["email"].(string)
	displayName, _ := payload.Claims["name"].(string)
	photoURL, _ := payload.Claims["picture"].(string)

	if googleID == "" || email == "" {
		return nil, apperror.ErrUnauthorized.WithMessage("Token thiếu thông tin bắt buộc")
	}

	// 3. Find existing user by Google ID
	isFirstLogin := false
	user, err := s.userRepo.FindByGoogleID(ctx, googleID)
	if err != nil {
		// 4. Not found by google_id — check by email (link existing account)
		user, err = s.userRepo.FindByEmail(ctx, email)
		if err != nil {
			// 5. Completely new user — create account
			newUser := &entity.User{
				GoogleID:    googleID,
				Email:       email,
				DisplayName: displayName,
				PhotoURL:    photoURL,
				Role:        entity.UserRoleUser,
				Status:      entity.UserStatusActive,
			}
			if createErr := s.userRepo.Create(ctx, newUser); createErr != nil {
				return nil, fmt.Errorf("failed to create user: %w", createErr)
			}
			user = newUser
			isFirstLogin = true
			tlog.Info("New user created via Google Sign-In",
				zap.Uint("user_id", user.ID),
				zap.String("email", email),
			)
		} else {
			// Link existing account with Google ID
			user.GoogleID = googleID
			user.DisplayName = displayName
			user.PhotoURL = photoURL
			if updateErr := s.userRepo.Update(ctx, user); updateErr != nil {
				return nil, fmt.Errorf("failed to link google account: %w", updateErr)
			}
			tlog.Info("Existing user linked to Google account",
				zap.Uint("user_id", user.ID),
				zap.String("email", email),
			)
		}
	} else {
		// Returning user — refresh display info
		user.DisplayName = displayName
		user.PhotoURL = photoURL
		_ = s.userRepo.Update(ctx, user)
	}

	// 6. Check account is active
	if user.Status != entity.UserStatusActive {
		return nil, apperror.ErrForbidden.WithMessage("Tài khoản đã bị vô hiệu hóa")
	}

	// 7. Generate token pair (app token + refresh token)
	appToken, refreshToken, err := s.generateTokenPair(user)
	if err != nil {
		return nil, apperror.ErrInternalServerError.WithMessage("Không thể tạo token").WithError(err)
	}

	tlog.Info("User signed in via Google",
		zap.Uint("user_id", user.ID),
		zap.Bool("first_login", isFirstLogin),
	)

	return &dto.GoogleSignInResponse{
		User: dto.UserResponse{
			ID:          user.ID,
			GoogleID:    user.GoogleID,
			Email:       user.Email,
			DisplayName: user.DisplayName,
			PhotoURL:    user.PhotoURL,
			Role:        user.Role,
			Status:      user.Status,
			CreatedAt:   user.CreatedAt,
			UpdatedAt:   user.UpdatedAt,
		},
		AppToken:         appToken,
		ExpiresIn:        s.jwtService.GetAppExpirySeconds(),
		RefreshToken:     refreshToken,
		RefreshExpiresIn: s.jwtService.GetRefreshExpirySeconds(),
		IsFirstLogin:     isFirstLogin,
	}, nil
}

// RefreshToken validates a refresh token and issues a new token pair (token rotation).
func (s *authServiceImpl) RefreshToken(ctx context.Context, refreshToken string) (*dto.RefreshTokenResponse, error) {
	// 1. Validate the refresh token signature and expiry
	claims, err := s.jwtService.ValidateRefreshToken(refreshToken)
	if err != nil {
		return nil, apperror.ErrUnauthorized.WithMessage("Refresh token không hợp lệ hoặc đã hết hạn")
	}

	// 2. Reject blacklisted (signed-out) refresh tokens
	if s.tokenBlacklist.IsBlacklisted(refreshToken) {
		return nil, apperror.ErrUnauthorized.WithMessage("Refresh token đã bị thu hồi, vui lòng đăng nhập lại")
	}

	// 3. Verify the user still exists and is active in DB
	user, err := s.userRepo.FindByID(ctx, claims.UserID)
	if err != nil {
		return nil, apperror.ErrUnauthorized.WithMessage("Người dùng không tồn tại")
	}
	if user.Status != entity.UserStatusActive {
		return nil, apperror.ErrForbidden.WithMessage("Tài khoản đã bị vô hiệu hóa")
	}

	// 4. Generate a brand-new token pair (rotation — old refresh token is now superseded)
	newAppToken, newRefreshToken, err := s.generateTokenPair(user)
	if err != nil {
		return nil, apperror.ErrInternalServerError.WithMessage("Không thể tạo token mới").WithError(err)
	}

	tlog.Info("Token refreshed",
		zap.Uint("user_id", user.ID),
	)

	return &dto.RefreshTokenResponse{
		AppToken:         newAppToken,
		ExpiresIn:        s.jwtService.GetAppExpirySeconds(),
		RefreshToken:     newRefreshToken,
		RefreshExpiresIn: s.jwtService.GetRefreshExpirySeconds(),
	}, nil
}

// SignOut invalidates the given refresh token so it cannot be used for silent re-auth.
// The client is responsible for clearing the app token from its own secure storage.
func (s *authServiceImpl) SignOut(ctx context.Context, refreshToken string) error {
	// Parse the token to get its expiry — we don't need the claims, just the expiry time.
	expiresAt, err := s.jwtService.GetRefreshTokenExpiry(refreshToken)
	if err != nil {
		// If the token is already expired or invalid it poses no threat; treat as success.
		tlog.Debug("SignOut: refresh token already invalid, nothing to revoke", zap.Error(err))
		return nil
	}

	// Blacklist until the token's natural expiry so the store TTL stays tight.
	s.tokenBlacklist.Add(refreshToken, expiresAt)

	tlog.Info("User signed out — refresh token revoked",
		zap.Time("token_expires_at", expiresAt),
	)
	return nil
}
