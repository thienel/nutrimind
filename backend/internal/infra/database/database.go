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

	// dsn is kept so health checks can open a brand-new connection with the
	// same credentials the pool was built with.
	dsn string
)

// Init initializes the GORM database connection and runs AutoMigrate
func Init(cfg *config.DatabaseConfig) error {
	var initErr error

	once.Do(func() {
		dsn = fmt.Sprintf(
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

		// AutoMigrate all models — new columns are added automatically
		if err := gormDB.AutoMigrate(
			&entity.User{},
			&entity.HealthProfile{},
			&entity.WeightEntry{},
			&entity.MealEntry{},
			&entity.WaterEntry{},
			&entity.UserDevice{},
			&entity.ReminderConfig{},
			&entity.NotificationLog{},
			&entity.Friendship{},
			&entity.Challenge{},
			&entity.ChallengeEnrollment{},
			&entity.ChallengeDailyCompletion{},
			&entity.CheerReaction{},
		); err != nil {
			initErr = fmt.Errorf("failed to run auto migrate: %w", err)
			return
		}

		// Composite unique index: one weight entry per user per day
		if err := gormDB.Exec(
			`CREATE UNIQUE INDEX IF NOT EXISTS idx_weight_entries_user_logged_at ON weight_entries(user_id, logged_at)`,
		).Error; err != nil {
			initErr = fmt.Errorf("failed to create unique index on weight_entries: %w", err)
			return
		}

		// Non-unique index: fast lookups of meal entries by user + date
		if err := gormDB.Exec(
			`CREATE INDEX IF NOT EXISTS idx_meal_entries_user_logged_date ON meal_entries(user_id, logged_date DESC)`,
		).Error; err != nil {
			initErr = fmt.Errorf("failed to create index on meal_entries: %w", err)
			return
		}

		// Non-unique index: fast lookups of water entries by user + date
		if err := gormDB.Exec(
			`CREATE INDEX IF NOT EXISTS idx_water_entries_user_logged_date ON water_entries(user_id, logged_date DESC)`,
		).Error; err != nil {
			initErr = fmt.Errorf("failed to create index on water_entries: %w", err)
			return
		}

		// Unique index: one FCM token per user per platform
		if err := gormDB.Exec(
			`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_devices_user_platform ON user_devices(user_id, platform)`,
		).Error; err != nil {
			initErr = fmt.Errorf("failed to create index on user_devices: %w", err)
			return
		}

		// Unique index: one reminder config per user per type
		if err := gormDB.Exec(
			`CREATE UNIQUE INDEX IF NOT EXISTS idx_reminder_configs_user_type ON reminder_configs(user_id, reminder_type)`,
		).Error; err != nil {
			initErr = fmt.Errorf("failed to create index on reminder_configs: %w", err)
			return
		}

		// Index: fast lookups of notification logs by user
		if err := gormDB.Exec(
			`CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id, created_at DESC)`,
		).Error; err != nil {
			initErr = fmt.Errorf("failed to create index on notification_logs: %w", err)
			return
		}

		// Indexes for social features
		if err := gormDB.Exec(
			`CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id)`,
		).Error; err != nil {
			initErr = fmt.Errorf("failed to create index on friendships: %w", err)
			return
		}
		if err := gormDB.Exec(
			`CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id)`,
		).Error; err != nil {
			initErr = fmt.Errorf("failed to create index on friendships: %w", err)
			return
		}
		if err := gormDB.Exec(
			`CREATE INDEX IF NOT EXISTS idx_challenge_enrollments_user ON challenge_enrollments(user_id, status)`,
		).Error; err != nil {
			initErr = fmt.Errorf("failed to create index on challenge_enrollments: %w", err)
			return
		}
		if err := gormDB.Exec(
			`CREATE INDEX IF NOT EXISTS idx_challenge_daily_completions_enrollment ON challenge_daily_completions(enrollment_id, completion_date)`,
		).Error; err != nil {
			initErr = fmt.Errorf("failed to create index on challenge_daily_completions: %w", err)
			return
		}
		if err := gormDB.Exec(
			`CREATE INDEX IF NOT EXISTS idx_cheer_reactions_sender_date ON cheer_reactions(sender_id, sent_date)`,
		).Error; err != nil {
			initErr = fmt.Errorf("failed to create index on cheer_reactions: %w", err)
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
