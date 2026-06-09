package database

import (
	"fmt"
	"sync"

	"github.com/thienel/tlog"
	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/pkg/config"
)

var (
	db   *gorm.DB
	once sync.Once
)

// Init initializes the GORM database connection and runs AutoMigrate
func Init(cfg *config.DatabaseConfig) error {
	var initErr error

	once.Do(func() {
		dsn := fmt.Sprintf(
			"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s TimeZone=%s",
			cfg.Host,
			cfg.Port,
			cfg.User,
			cfg.Password,
			cfg.DBName,
			cfg.SSLMode,
			cfg.TimeZone,
		)

		gormLogger := logger.Default.LogMode(logger.Silent)

		gormDB, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: gormLogger,
		})
		if err != nil {
			initErr = fmt.Errorf("failed to connect to database: %w", err)
			return
		}

		// Configure connection pool
		sqlDB, err := gormDB.DB()
		if err != nil {
			initErr = fmt.Errorf("failed to get underlying sql.DB: %w", err)
			return
		}
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetMaxOpenConns(100)

		// AutoMigrate all models
		if err := gormDB.AutoMigrate(&entity.User{}, &entity.HealthProfile{}); err != nil {
			initErr = fmt.Errorf("failed to run auto migrate: %w", err)
			return
		}

		db = gormDB

		tlog.Info("Database connection established",
			zap.String("host", cfg.Host),
			zap.Int("port", cfg.Port),
			zap.String("database", cfg.DBName),
		)
	})

	return initErr
}

// GetDB returns the *gorm.DB instance
func GetDB() *gorm.DB {
	return db
}

// Close closes the underlying database connection
func Close() error {
	if db == nil {
		return nil
	}
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
