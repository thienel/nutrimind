package main

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/thienel/tlog"
	"go.uber.org/zap"

	"nutrimind-backend/internal/infra/database"
	"nutrimind-backend/internal/infra/persistence"
	"nutrimind-backend/internal/interface/api/handler"
	"nutrimind-backend/internal/interface/api/middleware"
	"nutrimind-backend/internal/interface/api/router"
	"nutrimind-backend/internal/usecase/service/serviceimpl"
	"nutrimind-backend/pkg/config"
)

// setupDependencies wires up all layers and returns the configured router
func setupDependencies(cfg *config.Config) *gin.Engine {
	// Repositories
	db := database.GetDB()
	userRepo := persistence.NewUserRepository(db)

	// Services
	jwtService := serviceimpl.NewJWTService(
		cfg.JWT.Secret,
		cfg.JWT.AppExpiryDays,
	)
	authService := serviceimpl.NewAuthService(userRepo, jwtService, cfg.Google.ClientID)
	userService := serviceimpl.NewUserService(userRepo)

	// Middleware
	origins := strings.Join(cfg.CORSAllowedOrigins, ",")
	mw := middleware.New(jwtService, origins)

	// Handlers
	authHandler := handler.NewAuthHandler(authService, userService)
	userHandler := handler.NewUserHandler(userService)

	// Build router
	return router.SetupRouter(authHandler, userHandler, mw)
}

func init() {
	_ = tlog.Info
	_ = zap.String
}
