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
)

type authServiceImpl struct {
	userRepo         repository.UserRepository
	jwtService       service.JWTService
	googleClientIDs  []string
}

// NewAuthService creates a new auth service.
// googleClientIDs accepts Web and/or iOS Client IDs — token audience is matched against each.
func NewAuthService(
	userRepo repository.UserRepository,
	jwtService service.JWTService,
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

// GoogleSignIn verifies a Google ID token, creates or finds the user, and returns a signed app token.
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

	// 7. Generate app token (30 days)
	appToken, err := s.jwtService.GenerateAppToken(user.ID, user.GoogleID, user.Role)
	if err != nil {
		return nil, apperror.ErrInternalServerError.WithMessage("Không thể tạo app token").WithError(err)
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
		AppToken:     appToken,
		ExpiresIn:    s.jwtService.GetAppExpirySeconds(),
		IsFirstLogin: isFirstLogin,
	}, nil
}
