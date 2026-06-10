package router

import (
	"github.com/gin-gonic/gin"
	"github.com/thienel/tlog"

	"nutrimind-backend/internal/interface/api/handler"
	"nutrimind-backend/internal/interface/api/middleware"
)

type routeRegister struct {
	auth          handler.AuthHandler
	user          handler.UserHandler
	healthProfile handler.HealthProfileHandler
	weightEntry   handler.WeightEntryHandler
	mw            *middleware.Middleware
}

// SetupRouter configures all routes under /api/v1.
func SetupRouter(
	authHandler handler.AuthHandler,
	userHandler handler.UserHandler,
	healthProfileHandler handler.HealthProfileHandler,
	weightEntryHandler handler.WeightEntryHandler,
	mw *middleware.Middleware,
) *gin.Engine {

	routes := routeRegister{
		auth:          authHandler,
		user:          userHandler,
		healthProfile: healthProfileHandler,
		weightEntry:   weightEntryHandler,
		mw:            mw,
	}

	router := gin.New()
	router.Use(gin.Recovery(), mw.CORS(), tlog.GinMiddleware(tlog.WithSkipPaths("/health")))

	// Health check (no versioning)
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
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
		routes.registerWeightEntryRoutes(protected)
	}

	return router
}

func (r *routeRegister) registerAuthRoutes(rg *gin.RouterGroup) {
	auth := rg.Group("/auth")
	{
		auth.POST("/google", r.auth.GoogleSignIn)
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

func (r *routeRegister) registerWeightEntryRoutes(rg *gin.RouterGroup) {
	we := rg.Group("/weight-entries")
	{
		we.POST("", r.weightEntry.LogWeight)
		we.GET("", r.weightEntry.GetHistory)
		we.GET("/date", r.weightEntry.GetByDate)
		we.DELETE("/:id", r.weightEntry.Delete)
	}
}
