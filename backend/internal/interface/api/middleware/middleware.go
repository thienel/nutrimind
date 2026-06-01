package middleware

import (
	"strings"

	"nutrimind-backend/internal/usecase/service"
)

// Middleware holds all middleware dependencies
type Middleware struct {
	jwtService     service.JWTService
	origins        string
	allowedOrigins []string
	allowAll       bool
}

// New creates a new Middleware instance
func New(jwtService service.JWTService, origins string) *Middleware {
	allowed := strings.Split(origins, ",")
	allowAll := len(allowed) == 1 && strings.TrimSpace(allowed[0]) == "*"

	for i := range allowed {
		allowed[i] = strings.TrimSpace(allowed[i])
	}

	return &Middleware{
		jwtService:     jwtService,
		origins:        origins,
		allowedOrigins: allowed,
		allowAll:       allowAll,
	}
}
