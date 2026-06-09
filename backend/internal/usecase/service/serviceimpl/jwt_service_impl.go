package serviceimpl

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"nutrimind-backend/internal/domain/valueobject"
	"nutrimind-backend/internal/usecase/service"
	apperror "nutrimind-backend/pkg/error"
)

type jwtServiceImpl struct {
	secret            string
	appExpiryDays     int
	refreshExpiryDays int
}

// NewJWTService creates a new JWT service.
// appExpiryDays: lifetime of the short-lived app token (default 30).
// refreshExpiryDays: lifetime of the long-lived refresh token (default 90).
func NewJWTService(secret string, appExpiryDays, refreshExpiryDays int) service.JWTService {
	return &jwtServiceImpl{
		secret:            secret,
		appExpiryDays:     appExpiryDays,
		refreshExpiryDays: refreshExpiryDays,
	}
}

// jwtClaims is the internal claims struct used by both app and refresh tokens.
type jwtClaims struct {
	UserID    uint   `json:"user_id"`
	GoogleID  string `json:"google_id"`
	Role      string `json:"role"`
	TokenType string `json:"token_type"` // "app" | "refresh"
	jwt.RegisteredClaims
}

// GenerateAppToken generates a short-lived JWT (30 days by default per SRS §6.7)
func (s *jwtServiceImpl) GenerateAppToken(userID uint, googleID, role string) (string, error) {
	// FOR TESTING: Set app token expiry to 30 seconds
	expiry := time.Now().Add(time.Duration(s.appExpiryDays) * 24 * time.Hour)
	// expiry := time.Now().Add(30 * time.Second)

	claims := jwtClaims{
		UserID:    userID,
		GoogleID:  googleID,
		Role:      role,
		TokenType: "app",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiry),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   googleID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.secret))
}

// GenerateRefreshToken generates a long-lived refresh JWT (90 days by default).
func (s *jwtServiceImpl) GenerateRefreshToken(userID uint, googleID, role string) (string, error) {
	expiry := time.Now().Add(time.Duration(s.refreshExpiryDays) * 24 * time.Hour)

	claims := jwtClaims{
		UserID:    userID,
		GoogleID:  googleID,
		Role:      role,
		TokenType: "refresh",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiry),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   googleID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.secret))
}

// parseToken is the shared parsing helper; it handles signature verification and expiry.
func (s *jwtServiceImpl) parseToken(tokenString string) (*jwtClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &jwtClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid signing method")
		}
		return []byte(s.secret), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, apperror.ErrTokenExpired
		}
		return nil, apperror.ErrUnauthorized.WithMessage("Token không hợp lệ")
	}

	claims, ok := token.Claims.(*jwtClaims)
	if !ok || !token.Valid {
		return nil, apperror.ErrUnauthorized.WithMessage("Token không hợp lệ")
	}
	return claims, nil
}

// ValidateToken validates an app JWT and returns its claims.
func (s *jwtServiceImpl) ValidateToken(tokenString string) (*valueobject.JWTClaims, error) {
	claims, err := s.parseToken(tokenString)
	if err != nil {
		return nil, err
	}
	// Reject refresh tokens from being used as app tokens
	if claims.TokenType == "refresh" {
		return nil, apperror.ErrUnauthorized.WithMessage("Token không hợp lệ")
	}
	return &valueobject.JWTClaims{
		UserID:   claims.UserID,
		GoogleID: claims.GoogleID,
		Role:     claims.Role,
	}, nil
}

// GetRefreshTokenExpiry parses a refresh token and returns its expiry time.
func (s *jwtServiceImpl) GetRefreshTokenExpiry(tokenString string) (time.Time, error) {
	claims, err := s.parseToken(tokenString)
	if err != nil {
		return time.Time{}, err
	}
	if claims.TokenType != "refresh" {
		return time.Time{}, apperror.ErrUnauthorized.WithMessage("Token không hợp lệ")
	}
	if claims.ExpiresAt == nil {
		return time.Time{}, apperror.ErrUnauthorized.WithMessage("Token thiếu thông tin hết hạn")
	}
	return claims.ExpiresAt.Time, nil
}

// ValidateRefreshToken validates a refresh JWT and returns its claims.
func (s *jwtServiceImpl) ValidateRefreshToken(tokenString string) (*valueobject.JWTClaims, error) {
	claims, err := s.parseToken(tokenString)
	if err != nil {
		return nil, err
	}
	// Only accept refresh-typed tokens
	if claims.TokenType != "refresh" {
		return nil, apperror.ErrUnauthorized.WithMessage("Token không hợp lệ")
	}
	return &valueobject.JWTClaims{
		UserID:   claims.UserID,
		GoogleID: claims.GoogleID,
		Role:     claims.Role,
	}, nil
}

func (s *jwtServiceImpl) GetAppExpirySeconds() int {
	// FOR TESTING: return 30 seconds
	return s.appExpiryDays * 24 * 3600
	// return 30
}

func (s *jwtServiceImpl) GetRefreshExpirySeconds() int {
	return s.refreshExpiryDays * 24 * 3600
}
