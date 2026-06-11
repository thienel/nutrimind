package serviceimpl

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/thienel/tlog"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/api/idtoken"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/domain/repository"
	"nutrimind-backend/internal/infra/email"
	"nutrimind-backend/internal/interface/api/dto"
	"nutrimind-backend/internal/usecase/service"
	apperror "nutrimind-backend/pkg/error"
	"nutrimind-backend/pkg/tokenstore"
)

type authServiceImpl struct {
	userRepo        repository.UserRepository
	jwtService      service.JWTService
	tokenBlacklist  tokenstore.Store
	emailSender     email.Sender
	googleClientIDs []string
}

// NewAuthService creates a new auth service.
// emailSender may be nil — pass email.NewNoopSender() to disable outgoing mail.
// googleClientIDs accepts Web and/or iOS Client IDs — token audience is matched against each.
func NewAuthService(
	userRepo repository.UserRepository,
	jwtService service.JWTService,
	tokenBlacklist tokenstore.Store,
	emailSender email.Sender,
	googleClientIDs ...string,
) service.AuthService {
	ids := make([]string, 0, len(googleClientIDs))
	for _, id := range googleClientIDs {
		if id != "" {
			ids = append(ids, id)
		}
	}
	if emailSender == nil {
		emailSender = email.NewNoopSender()
	}
	return &authServiceImpl{
		userRepo:        userRepo,
		jwtService:      jwtService,
		tokenBlacklist:  tokenBlacklist,
		emailSender:     emailSender,
		googleClientIDs: ids,
	}
}

// googleIDStr safely dereferences a nullable GoogleID pointer.
func googleIDStr(id *string) string {
	if id == nil {
		return ""
	}
	return *id
}

// validateGoogleToken tries each configured client ID until one validates successfully.
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
	gID := googleIDStr(user.GoogleID)
	appToken, err = s.jwtService.GenerateAppToken(user.ID, gID, user.Role)
	if err != nil {
		return "", "", fmt.Errorf("generate app token: %w", err)
	}
	refreshToken, err = s.jwtService.GenerateRefreshToken(user.ID, gID, user.Role)
	if err != nil {
		return "", "", fmt.Errorf("generate refresh token: %w", err)
	}
	return appToken, refreshToken, nil
}

// toUserResponse converts an entity.User into a dto.UserResponse.
func toUserDTOResponse(user *entity.User) dto.UserResponse {
	return dto.UserResponse{
		ID:          user.ID,
		GoogleID:    googleIDStr(user.GoogleID),
		Email:       user.Email,
		DisplayName: user.DisplayName,
		PhotoURL:    user.PhotoURL,
		Role:        user.Role,
		Status:      user.Status,
		CreatedAt:   user.CreatedAt,
		UpdatedAt:   user.UpdatedAt,
	}
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
	emailVal, _ := payload.Claims["email"].(string)
	displayName, _ := payload.Claims["name"].(string)
	photoURL, _ := payload.Claims["picture"].(string)

	if googleID == "" || emailVal == "" {
		return nil, apperror.ErrUnauthorized.WithMessage("Token thiếu thông tin bắt buộc")
	}

	// 3. Find existing user by Google ID
	isFirstLogin := false
	user, err := s.userRepo.FindByGoogleID(ctx, googleID)
	if err != nil {
		// 4. Not found by google_id — check by email (link existing account)
		user, err = s.userRepo.FindByEmail(ctx, emailVal)
		if err != nil {
			// 5. Completely new user — create account
			newUser := &entity.User{
				GoogleID:    &googleID,
				Email:       emailVal,
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
				zap.String("email", emailVal),
			)
		} else {
			// Link existing email account with Google ID
			user.GoogleID = &googleID
			user.DisplayName = displayName
			user.PhotoURL = photoURL
			if updateErr := s.userRepo.Update(ctx, user); updateErr != nil {
				return nil, fmt.Errorf("failed to link google account: %w", updateErr)
			}
			tlog.Info("Existing user linked to Google account",
				zap.Uint("user_id", user.ID),
				zap.String("email", emailVal),
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

	// 7. Generate token pair
	appToken, refreshToken, err := s.generateTokenPair(user)
	if err != nil {
		return nil, apperror.ErrInternalServerError.WithMessage("Không thể tạo token").WithError(err)
	}

	tlog.Info("User signed in via Google",
		zap.Uint("user_id", user.ID),
		zap.Bool("first_login", isFirstLogin),
	)

	return &dto.GoogleSignInResponse{
		User:             toUserDTOResponse(user),
		AppToken:         appToken,
		ExpiresIn:        s.jwtService.GetAppExpirySeconds(),
		RefreshToken:     refreshToken,
		RefreshExpiresIn: s.jwtService.GetRefreshExpirySeconds(),
		IsFirstLogin:     isFirstLogin,
	}, nil
}

// Register creates a new account with email + password and returns a token pair.
func (s *authServiceImpl) Register(ctx context.Context, emailVal, password, displayName string) (*dto.EmailAuthResponse, error) {
	emailVal = strings.ToLower(strings.TrimSpace(emailVal))

	// 1. Verify email is not already taken
	if _, err := s.userRepo.FindByEmail(ctx, emailVal); err == nil {
		return nil, apperror.ErrConflict.WithMessage("Email này đã được sử dụng")
	}

	// 2. Hash the password
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, apperror.ErrInternalServerError.WithMessage("Không thể xử lý mật khẩu").WithError(err)
	}

	// 3. Create user
	newUser := &entity.User{
		Email:        emailVal,
		PasswordHash: string(hash),
		DisplayName:  displayName,
		Role:         entity.UserRoleUser,
		Status:       entity.UserStatusActive,
	}
	if err := s.userRepo.Create(ctx, newUser); err != nil {
		return nil, err
	}

	tlog.Info("New user registered via email",
		zap.Uint("user_id", newUser.ID),
		zap.String("email", emailVal),
	)

	// 4. Send welcome email (non-blocking — failure does not abort registration)
	go func() {
		if err := s.emailSender.SendWelcomeEmail(emailVal, displayName); err != nil {
			tlog.Warn("Failed to send welcome email",
				zap.String("email", emailVal),
				zap.Error(err),
			)
		}
	}()

	// 5. Generate token pair
	appToken, refreshToken, err := s.generateTokenPair(newUser)
	if err != nil {
		return nil, apperror.ErrInternalServerError.WithMessage("Không thể tạo token").WithError(err)
	}

	return &dto.EmailAuthResponse{
		User:             toUserDTOResponse(newUser),
		AppToken:         appToken,
		ExpiresIn:        s.jwtService.GetAppExpirySeconds(),
		RefreshToken:     refreshToken,
		RefreshExpiresIn: s.jwtService.GetRefreshExpirySeconds(),
		IsFirstLogin:     true,
	}, nil
}

// EmailLogin validates email + password credentials and returns a token pair.
func (s *authServiceImpl) EmailLogin(ctx context.Context, emailVal, password string) (*dto.EmailAuthResponse, error) {
	emailVal = strings.ToLower(strings.TrimSpace(emailVal))

	// 1. Find user by email
	user, err := s.userRepo.FindByEmail(ctx, emailVal)
	if err != nil {
		// Return generic message to avoid email enumeration
		return nil, apperror.ErrUnauthorized.WithMessage("Email hoặc mật khẩu không đúng")
	}

	// 2. Ensure account has a password (not a Google-only account)
	if user.PasswordHash == "" {
		return nil, apperror.ErrUnauthorized.WithMessage("Tài khoản này đăng nhập bằng Google, vui lòng sử dụng Google Sign-In")
	}

	// 3. Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, apperror.ErrUnauthorized.WithMessage("Email hoặc mật khẩu không đúng")
	}

	// 4. Check account is active
	if user.Status != entity.UserStatusActive {
		return nil, apperror.ErrForbidden.WithMessage("Tài khoản đã bị vô hiệu hóa")
	}

	// 5. Generate token pair
	appToken, refreshToken, err := s.generateTokenPair(user)
	if err != nil {
		return nil, apperror.ErrInternalServerError.WithMessage("Không thể tạo token").WithError(err)
	}

	tlog.Info("User signed in via email",
		zap.Uint("user_id", user.ID),
	)

	return &dto.EmailAuthResponse{
		User:             toUserDTOResponse(user),
		AppToken:         appToken,
		ExpiresIn:        s.jwtService.GetAppExpirySeconds(),
		RefreshToken:     refreshToken,
		RefreshExpiresIn: s.jwtService.GetRefreshExpirySeconds(),
		IsFirstLogin:     false,
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

	// 4. Generate a brand-new token pair (rotation)
	newAppToken, newRefreshToken, err := s.generateTokenPair(user)
	if err != nil {
		return nil, apperror.ErrInternalServerError.WithMessage("Không thể tạo token mới").WithError(err)
	}

	tlog.Info("Token refreshed", zap.Uint("user_id", user.ID))

	return &dto.RefreshTokenResponse{
		AppToken:         newAppToken,
		ExpiresIn:        s.jwtService.GetAppExpirySeconds(),
		RefreshToken:     newRefreshToken,
		RefreshExpiresIn: s.jwtService.GetRefreshExpirySeconds(),
	}, nil
}

// SignOut invalidates the given refresh token so it cannot be used for silent re-auth.
func (s *authServiceImpl) SignOut(ctx context.Context, refreshToken string) error {
	expiresAt, err := s.jwtService.GetRefreshTokenExpiry(refreshToken)
	if err != nil {
		tlog.Debug("SignOut: refresh token already invalid, nothing to revoke", zap.Error(err))
		return nil
	}

	s.tokenBlacklist.Add(refreshToken, expiresAt)

	tlog.Info("User signed out — refresh token revoked",
		zap.Time("token_expires_at", expiresAt),
	)
	return nil
}
