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
	secret        string
	appExpiryDays int
}

// NewJWTService creates a new JWT service
func NewJWTService(secret string, appExpiryDays int) service.JWTService {
	return &jwtServiceImpl{
		secret:        secret,
		appExpiryDays: appExpiryDays,
	}
}

type jwtClaims struct {
	UserID   uint   `json:"user_id"`
	GoogleID string `json:"google_id"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

// GenerateAppToken generates a long-lived JWT (30 days by default per SRS §6.7)
func (s *jwtServiceImpl) GenerateAppToken(userID uint, googleID, role string) (string, error) {
	expiry := time.Now().Add(time.Duration(s.appExpiryDays) * 24 * time.Hour)

	claims := jwtClaims{
		UserID:   userID,
		GoogleID: googleID,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiry),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   googleID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.secret))
}

func (s *jwtServiceImpl) ValidateToken(tokenString string) (*valueobject.JWTClaims, error) {
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

	return &valueobject.JWTClaims{
		UserID:   claims.UserID,
		GoogleID: claims.GoogleID,
		Role:     claims.Role,
	}, nil
}

func (s *jwtServiceImpl) GetAppExpirySeconds() int {
	return s.appExpiryDays * 24 * 3600
}
