package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"

	"nutrimind-backend/internal/domain/valueobject"
	apperror "nutrimind-backend/pkg/error"
	"nutrimind-backend/pkg/response"
)

type ContextKey string

const UserContextKey ContextKey = "user"

// Auth returns JWT authentication middleware
func (m *Middleware) Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := getTokenFromHeader(c.GetHeader("Authorization"))
		if token == "" {
			response.WriteErrorResponse(c, apperror.ErrUnauthorized)
			c.Abort()
			return
		}

		claims, err := m.jwtService.ValidateToken(token)
		if err != nil {
			response.WriteErrorResponse(c, err)
			c.Abort()
			return
		}

		c.Set(string(UserContextKey), claims)
		c.Next()
	}
}

func getTokenFromHeader(authHeader string) string {
	if authHeader == "" {
		return ""
	}
	parts := strings.Split(authHeader, " ")
	if len(parts) == 2 && parts[0] == "Bearer" {
		return parts[1]
	}
	return ""
}

// GetUserClaims retrieves user claims from context
func GetUserClaims(c *gin.Context) *valueobject.JWTClaims {
	v, exists := c.Get(string(UserContextKey))
	if !exists {
		return nil
	}
	claims, ok := v.(*valueobject.JWTClaims)
	if !ok {
		return nil
	}
	return claims
}

// GetUserID retrieves user ID from context
func GetUserID(c *gin.Context) uint {
	claims := GetUserClaims(c)
	if claims == nil {
		return 0
	}
	return claims.UserID
}

// GetGoogleID retrieves google ID from context
func GetGoogleID(c *gin.Context) string {
	claims := GetUserClaims(c)
	if claims == nil {
		return ""
	}
	return claims.GoogleID
}

