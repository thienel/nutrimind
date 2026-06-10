package main

import (
	"context"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/thienel/tlog"
	"go.uber.org/zap"

	"nutrimind-backend/internal/infra/aiclient"
	"nutrimind-backend/internal/infra/cache"
	"nutrimind-backend/internal/infra/database"
	"nutrimind-backend/internal/infra/fcm"
	"nutrimind-backend/internal/infra/persistence"
	"nutrimind-backend/internal/infra/scheduler"
	"nutrimind-backend/internal/interface/api/handler"
	"nutrimind-backend/internal/interface/api/middleware"
	"nutrimind-backend/internal/interface/api/router"
	"nutrimind-backend/internal/usecase/service"
	"nutrimind-backend/internal/usecase/service/serviceimpl"
	"nutrimind-backend/pkg/config"
	"nutrimind-backend/pkg/tokenstore"
)

// setupDependencies wires up all layers and returns the configured router.
func setupDependencies(cfg *config.Config) *gin.Engine {
	// Repositories
	db := database.GetDB()
	userRepo := persistence.NewUserRepository(db)
	healthProfileRepo := persistence.NewHealthProfileRepository(db)
	weightEntryRepo := persistence.NewWeightEntryRepository(db)
	mealEntryRepo := persistence.NewMealEntryRepository(db)
	waterEntryRepo := persistence.NewWaterEntryRepository(db)
	deviceRepo := persistence.NewUserDeviceRepository(db)
	reminderRepo := persistence.NewReminderConfigRepository(db)
	notifRepo := persistence.NewNotificationLogRepository(db)

	// Shared infrastructure
	tokenBlacklist := tokenstore.New(time.Hour)

	var dupChecker service.MealDupChecker
	if opts, err := redis.ParseURL(cfg.RedisURL); err == nil {
		dupChecker = cache.NewRedisDupChecker(redis.NewClient(opts))
	} else {
		dupChecker = cache.NewNoopDupChecker()
	}

	aiAnalyzer := aiclient.NewOpenAIClient(cfg.OpenAI.APIKey, cfg.OpenAI.Model)

	// FCM sender — falls back to noop when Firebase is not configured
	var fcmSender fcm.Sender
	if cfg.Firebase.ProjectID != "" {
		ctx := context.Background()
		if s, err := fcm.NewFirebaseSender(ctx, cfg.Firebase.ProjectID, cfg.Firebase.CredentialsJSON); err == nil {
			fcmSender = s
		} else {
			tlog.Warn("Firebase init failed, FCM disabled", zap.Error(err))
			fcmSender = fcm.NewNoopSender()
		}
	} else {
		fcmSender = fcm.NewNoopSender()
	}

	// Services
	jwtService := serviceimpl.NewJWTService(cfg.JWT.Secret, cfg.JWT.AppExpiryDays, cfg.JWT.RefreshExpiryDays)
	authService := serviceimpl.NewAuthService(userRepo, jwtService, tokenBlacklist, cfg.Google.ClientID, cfg.Google.ClientIDIOS)
	userService := serviceimpl.NewUserService(userRepo)
	healthProfileService := serviceimpl.NewHealthProfileService(healthProfileRepo, userRepo, weightEntryRepo)
	healthMetricService := serviceimpl.NewHealthMetricService(healthProfileRepo, weightEntryRepo)
	mealService := serviceimpl.NewMealService(mealEntryRepo, dupChecker, aiAnalyzer)
	waterService := serviceimpl.NewWaterService(waterEntryRepo, healthProfileRepo)
	aiCoachService := serviceimpl.NewAICoachService(healthProfileRepo, mealEntryRepo, waterEntryRepo, aiAnalyzer)
	notifService := serviceimpl.NewNotificationService(deviceRepo, reminderRepo, notifRepo)

	// Middleware
	mw := middleware.New(jwtService, strings.Join(cfg.CORSAllowedOrigins, ","))

	// Handlers
	authHandler := handler.NewAuthHandler(authService, userService)
	userHandler := handler.NewUserHandler(userService)
	healthProfileHandler := handler.NewHealthProfileHandler(healthProfileService)
	healthMetricHandler := handler.NewHealthMetricHandler(healthMetricService)
	mealHandler := handler.NewMealHandler(mealService)
	waterHandler := handler.NewWaterHandler(waterService)
	aiCoachHandler := handler.NewAICoachHandler(aiCoachService)
	notifHandler := handler.NewNotificationHandler(notifService)

	// Start background reminder scheduler
	sched := scheduler.New(reminderRepo, deviceRepo, notifRepo, fcmSender)
	go sched.Start(context.Background())

	return router.SetupRouter(
		authHandler, userHandler, healthProfileHandler, healthMetricHandler,
		mealHandler, waterHandler, aiCoachHandler, notifHandler, mw,
	)
}

func init() {
	_ = tlog.Info
	_ = zap.String
}
