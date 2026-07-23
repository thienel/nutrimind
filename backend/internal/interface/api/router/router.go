package router

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/thienel/tlog"

	"nutrimind-backend/internal/infra/database"
	"nutrimind-backend/internal/interface/api/handler"
	"nutrimind-backend/internal/interface/api/middleware"
)

type routeRegister struct {
	auth          handler.AuthHandler
	user          handler.UserHandler
	healthProfile handler.HealthProfileHandler
	healthMetric  handler.HealthMetricHandler
	meal          handler.MealHandler
	water         handler.WaterHandler
	aiCoach       handler.AICoachHandler
	notification  handler.NotificationHandler
	social        handler.SocialHandler
	mw            *middleware.Middleware
}

// SetupRouter configures all routes under /api/v1.
func SetupRouter(
	authHandler handler.AuthHandler,
	userHandler handler.UserHandler,
	healthProfileHandler handler.HealthProfileHandler,
	healthMetricHandler handler.HealthMetricHandler,
	mealHandler handler.MealHandler,
	waterHandler handler.WaterHandler,
	aiCoachHandler handler.AICoachHandler,
	notificationHandler handler.NotificationHandler,
	socialHandler handler.SocialHandler,
	mw *middleware.Middleware,
) *gin.Engine {

	routes := routeRegister{
		auth:          authHandler,
		user:          userHandler,
		healthProfile: healthProfileHandler,
		healthMetric:  healthMetricHandler,
		meal:          mealHandler,
		water:         waterHandler,
		aiCoach:       aiCoachHandler,
		notification:  notificationHandler,
		social:        socialHandler,
		mw:            mw,
	}

	router := gin.New()
	router.Use(gin.Recovery(), mw.CORS(), tlog.GinMiddleware(tlog.WithSkipPaths("/health")))

	// Health check (no versioning) — liveness only, deliberately does not touch
	// the database so a DB outage never gets the container killed.
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Readiness: actually reaches the database. Returns 503 when unreachable.
	router.GET("/health/db", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
		defer cancel()

		report := database.CheckHealth(ctx)

		status := http.StatusOK
		if !report.OK {
			status = http.StatusServiceUnavailable
		}
		c.JSON(status, report)
	})

	api := router.Group("/api/v1")
	{
		routes.registerAuthRoutes(api)
	}

	// Protected routes (Bearer token required)
	protected := api.Group("", mw.Auth())
	{
		routes.registerUserRoutes(protected)
		routes.registerProfileRoutes(protected)
		routes.registerHealthRoutes(protected)
		routes.registerMealRoutes(protected)
		routes.registerWaterRoutes(protected)
		routes.registerAIRoutes(protected)
		routes.registerNotificationRoutes(protected)
		routes.registerSocialRoutes(protected)
	}

	return router
}

func (r *routeRegister) registerAuthRoutes(rg *gin.RouterGroup) {
	auth := rg.Group("/auth")
	{
		auth.POST("/google", r.auth.GoogleSignIn)
		auth.POST("/register", r.auth.Register)
		auth.POST("/login", r.auth.EmailLogin)
		auth.POST("/refresh", r.auth.RefreshToken)
		auth.GET("/me", r.mw.Auth(), r.auth.GetMe)
		auth.POST("/signout", r.mw.Auth(), r.auth.SignOut)
	}
}

func (r *routeRegister) registerUserRoutes(rg *gin.RouterGroup) {
	users := rg.Group("/users")
	{
		users.GET("", r.user.List)
		users.GET("/:id", r.user.GetByID)
		users.PUT("/:id", r.user.Update)
		users.DELETE("/:id", r.user.Delete)
	}
}

func (r *routeRegister) registerProfileRoutes(rg *gin.RouterGroup) {
	profile := rg.Group("/profile")
	{
		// POST /api/v1/profile/onboarding — create/complete onboarding
		profile.POST("/onboarding", r.healthProfile.Onboarding)
		// GET  /api/v1/profile — get full profile
		profile.GET("", r.healthProfile.GetProfile)
		// PATCH /api/v1/profile — partial update
		profile.PATCH("", r.healthProfile.UpdateProfile)
		// PATCH /api/v1/profile/social — toggle social feature
		profile.PATCH("/social", r.healthProfile.ToggleSocial)
	}
}

func (r *routeRegister) registerHealthRoutes(rg *gin.RouterGroup) {
	health := rg.Group("/health")
	{
		health.POST("/weight", r.healthMetric.LogWeight)
		health.GET("/weight", r.healthMetric.GetWeightHistory)
		health.GET("/summary", r.healthMetric.GetHealthSummary)
	}
}

func (r *routeRegister) registerMealRoutes(rg *gin.RouterGroup) {
	meals := rg.Group("/meals")
	{
		meals.POST("", r.meal.LogMeal)
		meals.POST("/ai-analyze", r.meal.AIAnalyze)
		meals.GET("", r.meal.GetMealsByDate)
		meals.DELETE("/:id", r.meal.DeleteMeal)
	}
}

func (r *routeRegister) registerWaterRoutes(rg *gin.RouterGroup) {
	water := rg.Group("/water")
	{
		water.POST("", r.water.LogWater)
		water.GET("", r.water.GetWaterByDate)
		water.GET("/history", r.water.GetWaterHistory)
		water.DELETE("/:id", r.water.DeleteWater)
	}
}

func (r *routeRegister) registerAIRoutes(rg *gin.RouterGroup) {
	ai := rg.Group("/ai")
	{
		ai.POST("/advice", r.aiCoach.GetAdvice)
		ai.POST("/meal-suggestion", r.aiCoach.GetMealSuggestion)
	}
}

func (r *routeRegister) registerNotificationRoutes(rg *gin.RouterGroup) {
	rg.POST("/notifications/fcm-token", r.notification.RegisterFCMToken)
	rg.GET("/notifications", r.notification.ListNotifications)

	reminders := rg.Group("/reminders")
	{
		reminders.GET("", r.notification.GetReminders)
		reminders.PUT("/:type", r.notification.UpsertReminder)
	}
}

func (r *routeRegister) registerSocialRoutes(rg *gin.RouterGroup) {
	social := rg.Group("/social")
	{
		social.GET("/users/search", r.social.SearchUsers)
		social.GET("/feed", r.social.GetFeed)
		social.GET("/leaderboard", r.social.GetLeaderboard)

		friends := social.Group("/friends")
		{
			friends.GET("", r.social.GetFriends)
			friends.POST("/request", r.social.SendFriendRequest)
			friends.PATCH("/request/:friendship_id", r.social.RespondFriendRequest)
			friends.DELETE("/request/:friendship_id", r.social.CancelFriendRequest)
			friends.DELETE("/:user_id", r.social.RemoveFriend)
		}

		social.POST("/cheer", r.social.SendCheer)

		challenges := social.Group("/challenges")
		{
			challenges.GET("", r.social.GetChallengeCatalogue)
			challenges.POST("/:challenge_id/join", r.social.JoinChallenge)
			challenges.GET("/:challenge_id/progress", r.social.GetChallengeProgress)
			challenges.DELETE("/:challenge_id/enrollment", r.social.AbandonChallenge)
		}
	}
}
