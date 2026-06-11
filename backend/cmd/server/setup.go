package main

import (
	"context"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/thienel/tlog"
	"go.uber.org/zap"

	"nutrimind-backend/internal/domain/entity"
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
	friendshipRepo := persistence.NewFriendshipRepository(db)
	challengeRepo := persistence.NewChallengeRepository(db)
	enrollmentRepo := persistence.NewChallengeEnrollmentRepository(db)
	completionRepo := persistence.NewChallengeDailyCompletionRepository(db)
	cheerRepo := persistence.NewCheerReactionRepository(db)

	// Seed challenge catalogue.
	seedChallenges(challengeRepo)

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
	mealService := serviceimpl.NewMealService(mealEntryRepo, dupChecker, aiAnalyzer, userRepo, healthProfileRepo)
	waterService := serviceimpl.NewWaterService(waterEntryRepo, healthProfileRepo, userRepo)
	aiCoachService := serviceimpl.NewAICoachService(healthProfileRepo, mealEntryRepo, waterEntryRepo, aiAnalyzer)
	notifService := serviceimpl.NewNotificationService(deviceRepo, reminderRepo, notifRepo)
	socialService := serviceimpl.NewSocialService(
		healthProfileRepo, userRepo, mealEntryRepo, waterEntryRepo, weightEntryRepo,
		friendshipRepo, challengeRepo, enrollmentRepo, completionRepo, cheerRepo,
		deviceRepo, notifRepo, fcmSender,
	)

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
	socialHandler := handler.NewSocialHandler(socialService)

	// Start background schedulers
	sched := scheduler.New(reminderRepo, deviceRepo, notifRepo, fcmSender)
	go sched.Start(context.Background())

	challengeSched := scheduler.NewChallengeScheduler(
		enrollmentRepo, completionRepo, challengeRepo, mealEntryRepo, waterEntryRepo, healthProfileRepo,
	)
	go challengeSched.Start(context.Background())

	return router.SetupRouter(
		authHandler, userHandler, healthProfileHandler, healthMetricHandler,
		mealHandler, waterHandler, aiCoachHandler, notifHandler, socialHandler, mw,
	)
}

// seedChallenges inserts the two default challenges if they don't already exist.
func seedChallenges(repo interface {
	FirstOrCreate(ctx context.Context, c *entity.Challenge) error
}) {
	ctx := context.Background()
	challenges := []entity.Challenge{
		{
			Name:         "7-Day Hydration Challenge",
			Type:         entity.ChallengeTypeHydration,
			DurationDays: 7,
			Description:  "Đạt mục tiêu uống nước hằng ngày trong 7 ngày liên tiếp",
		},
		{
			Name:         "7-Day Calorie Goal Challenge",
			Type:         entity.ChallengeTypeCalorieGoal,
			DurationDays: 7,
			Description:  "Duy trì lượng calories trong mục tiêu 7 ngày liên tiếp",
		},
	}
	for i := range challenges {
		_ = repo.FirstOrCreate(ctx, &challenges[i])
	}
}

func init() {
	_ = tlog.Info
	_ = zap.String
}
