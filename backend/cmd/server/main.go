package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/thienel/tlog"
	"go.uber.org/zap"

	"nutrimind-backend/internal/infra/database"
	"nutrimind-backend/pkg/config"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize tlog
	err = tlog.Init(tlog.Config{
		Environment:   cfg.Server.Env,
		Level:         cfg.Log.Level,
		AppName:       cfg.Server.ServiceName,
		EnableConsole: cfg.Log.EnableConsole,
		EnableFile:    true,
		FilePath:      cfg.Log.FilePath,
		MaxSizeMB:     cfg.Log.MaxSizeMB,
		MaxBackups:    cfg.Log.MaxBackups,
		MaxAgeDays:    cfg.Log.MaxAgeDays,
		Compress:      cfg.Log.Compress,
	})
	if err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	defer tlog.Sync()

	tlog.Info("Starting server",
		zap.String("service", cfg.Server.ServiceName),
		zap.String("version", cfg.Server.Version),
		zap.String("env", cfg.Server.Env),
	)

	// Initialize database
	if err := database.Init(&cfg.Database); err != nil {
		tlog.Fatal("Failed to initialize database", zap.Error(err))
	}
	defer database.Close()

	tlog.Info("Database connection established")

	// Set Gin mode
	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}

	// Setup dependencies
	engine := setupDependencies(cfg)

	// Create HTTP server
	srv := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      engine,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server
	go func() {
		tlog.Info("Server starting",
			zap.String("port", cfg.Server.Port),
			zap.String("env", cfg.Server.Env),
		)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			tlog.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	tlog.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		tlog.Fatal("Server forced to shutdown", zap.Error(err))
	}

	tlog.Info("Server exited gracefully")
}
