package router

import (
	"github.com/gin-gonic/gin"
	"github.com/thienel/tlog"

	"nutrimind-backend/internal/interface/api/handler"
	"nutrimind-backend/internal/interface/api/middleware"
)

type routeRegister struct {
	auth handler.AuthHandler
	user handler.UserHandler
	mw   *middleware.Middleware
}

// SetupRouter configures all routes
func SetupRouter(
	authHandler handler.AuthHandler,
	userHandler handler.UserHandler,
	mw *middleware.Middleware,
) *gin.Engine {

	routes := routeRegister{
		auth: authHandler,
		user: userHandler,
		mw:   mw,
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
