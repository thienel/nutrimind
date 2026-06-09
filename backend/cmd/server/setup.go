package main

import (
	"strings"
	"time"

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
	"nutrimind-backend/pkg/tokenstore"
)

// setupDependencies wires up all layers and returns the configured router
func setupDependencies(cfg *config.Config) *gin.Engine {
	// Repositories
	db := database.GetDB()
	userRepo := persistence.NewUserRepository(db)
	healthProfileRepo := persistence.NewHealthProfileRepository(db)
	weightEntryRepo := persistence.NewWeightEntryRepository(db)

	// Shared infrastructure
	// Clean up expired blacklist entries every hour.
	tokenBlacklist := tokenstore.New(time.Hour)

	// Services
	jwtService := serviceimpl.NewJWTService(
		cfg.JWT.Secret,
		cfg.JWT.AppExpiryDays,
		cfg.JWT.RefreshExpiryDays,
	)
	authService := serviceimpl.NewAuthService(userRepo, jwtService, tokenBlacklist, cfg.Google.ClientID, cfg.Google.ClientIDIOS)
	userService := serviceimpl.NewUserService(userRepo)
	healthProfileService := serviceimpl.NewHealthProfileService(healthProfileRepo, userRepo)
	weightEntryService := serviceimpl.NewWeightEntryService(weightEntryRepo)

	// Middleware
	origins := strings.Join(cfg.CORSAllowedOrigins, ",")
	mw := middleware.New(jwtService, origins)

	// Handlers
	authHandler := handler.NewAuthHandler(authService, userService)
	userHandler := handler.NewUserHandler(userService)
	healthProfileHandler := handler.NewHealthProfileHandler(healthProfileService)
	weightEntryHandler := handler.NewWeightEntryHandler(weightEntryService)

	// Build router
	return router.SetupRouter(authHandler, userHandler, healthProfileHandler, weightEntryHandler, mw)
}

func init() {
	_ = tlog.Info
	_ = zap.String
}
