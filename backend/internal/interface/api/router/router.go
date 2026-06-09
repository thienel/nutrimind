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

// SetupRouter configures all routes
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

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	api := router.Group("/api")
	{
		routes.registerAuthRoutes(api)
	}

	// Protected routes (Bearer token required)
	protected := api.Group("", mw.Auth())
	{
		routes.registerUserRoutes(protected)
		routes.registerHealthProfileRoutes(protected)
		routes.registerWeightEntryRoutes(protected)
	}

	return router
}

func (r *routeRegister) registerAuthRoutes(rg *gin.RouterGroup) {
	auth := rg.Group("/auth")
	{
		// Public: exchange Google ID token for app token + refresh token
		auth.POST("/google", r.auth.GoogleSignIn)

		// Public: exchange a valid refresh token for a new token pair (silent re-auth)
		auth.POST("/refresh", r.auth.RefreshToken)

		// Protected: get current user
		auth.GET("/me", r.mw.Auth(), r.auth.GetMe)

		// Protected: sign out — revokes refresh token on server; client deletes app token from secure storage
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

func (r *routeRegister) registerHealthProfileRoutes(rg *gin.RouterGroup) {
	hp := rg.Group("/health-profile")
	{
		// Create profile for the first time
		hp.POST("", r.healthProfile.CreateProfile)
		// Get the current user's profile
		hp.GET("/me", r.healthProfile.GetMyProfile)
	}
}

func (r *routeRegister) registerWeightEntryRoutes(rg *gin.RouterGroup) {
	we := rg.Group("/weight-entries")
	{
		// POST   /api/weight-entries          — log / upsert for a given date
		we.POST("", r.weightEntry.LogWeight)
		// GET    /api/weight-entries          — paginated history (newest first)
		we.GET("", r.weightEntry.GetHistory)
		// GET    /api/weight-entries/date?date=YYYY-MM-DD
		we.GET("/date", r.weightEntry.GetByDate)
		// DELETE /api/weight-entries/:id
		we.DELETE("/:id", r.weightEntry.Delete)
	}
}
