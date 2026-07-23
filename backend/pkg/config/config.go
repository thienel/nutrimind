package config

import (
	"log"
	"net/url"

	"github.com/ilyakaznacheev/cleanenv"
	"github.com/thienel/tlog"
)

// ServerConfig holds server configuration
type ServerConfig struct {
	Port        string `env:"PORT" env-default:"8000"`
	Env         string `env:"ENV" env-default:"development"`
	ServiceName string `env:"SERVICE_NAME" env-default:"nutrimind-backend"`
	Version     string `env:"SERVICE_VERSION" env-default:"1.0.0"`
}

// DatabaseConfig holds PostgreSQL configuration
type DatabaseConfig struct {
	Host     string `env:"DB_HOST" env-default:"localhost"`
	Port     int    `env:"DB_PORT" env-default:"5432"`
	User     string `env:"DB_USER" env-default:"postgres"`
	Password string `env:"DB_PASSWORD"`
	DBName   string `env:"DB_NAME" env-default:"go_backend_template"`
	SSLMode  string `env:"DB_SSLMODE" env-default:"disable"`
	TimeZone string `env:"DB_TIMEZONE" env-default:"Asia/Ho_Chi_Minh"`
}

// JWTConfig holds JWT authentication configuration
type JWTConfig struct {
	Secret            string `env:"JWT_SECRET" env-default:"change-this-secret-in-production-min-32-chars"`
	AppExpiryDays     int    `env:"JWT_APP_EXPIRY_DAYS" env-default:"30"`
	RefreshExpiryDays int    `env:"JWT_REFRESH_EXPIRY_DAYS" env-default:"90"`
}

// LogConfig holds logging configuration
type LogConfig struct {
	Level         string `env:"LOG_LEVEL" env-default:"info"`
	EnableConsole bool   `env:"LOG_ENABLE_CONSOLE" env-default:"true"`
	FilePath      string `env:"LOG_FILE_PATH" env-default:"./logs/app.log"`
	MaxSizeMB     int    `env:"LOG_MAX_SIZE_MB" env-default:"100"`
	MaxBackups    int    `env:"LOG_MAX_BACKUPS" env-default:"30"`
	MaxAgeDays    int    `env:"LOG_MAX_AGE_DAYS" env-default:"90"`
	Compress      bool   `env:"LOG_COMPRESS" env-default:"true"`
}

// GoogleConfig holds Google OAuth configuration
type GoogleConfig struct {
	ClientID    string `env:"GOOGLE_CLIENT_ID"`
	ClientIDIOS string `env:"GOOGLE_CLIENT_ID_IOS"`
}

// OpenAIConfig holds OpenAI API configuration
type OpenAIConfig struct {
	APIKey string `env:"OPENAI_API_KEY"`
	Model  string `env:"OPENAI_VISION_MODEL" env-default:"gpt-4o"`
}

// FirebaseConfig holds Firebase / FCM configuration
type FirebaseConfig struct {
	ProjectID       string `env:"FIREBASE_PROJECT_ID"`
	CredentialsJSON string `env:"FIREBASE_CREDENTIALS_JSON"` // JSON string of service account key; falls back to ADC if empty
}

// SMTPConfig holds email / SMTP configuration (used for welcome emails, OTP, etc.)
type SMTPConfig struct {
	Host     string `env:"SMTP_HOST" env-default:"smtp.gmail.com"`
	Port     int    `env:"SMTP_PORT" env-default:"587"`
	Username string `env:"SMTP_USERNAME"`
	Password string `env:"SMTP_PASSWORD"`
	From     string `env:"SMTP_FROM"`
}

// Config holds all application configuration
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
	Google   GoogleConfig
	OpenAI   OpenAIConfig
	Firebase FirebaseConfig
	SMTP     SMTPConfig
	Log      LogConfig

	RedisURL           string   `env:"REDIS_URL" env-default:"redis://localhost:6379"`
	CORSAllowedOrigins []string `env:"CORS_ALLOWED_ORIGINS" env-default:"http://localhost:3000"`
}

var AppConfig *Config

// Load loads all configuration from environment variables
func Load() (*Config, error) {
	var cfg Config

	// Try reading from .env file first, but don't fail if it doesn't exist
	err := cleanenv.ReadConfig(".env", &cfg)
	if err != nil {
		tlog.Warn("No .env file found or error reading it, falling back to environment variables")
		err = cleanenv.ReadEnv(&cfg)
		if err != nil {
			log.Fatalf("Config error: %v", err)
			return nil, err
		}
	}

	AppConfig = &cfg
	return AppConfig, nil
}

// Helper methods on Config

func (c *Config) IsProduction() bool {
	return c.Server.Env == "production"
}

func (c *Config) IsDevelopment() bool {
	return c.Server.Env == "development"
}

func (c *Config) GetRedisAddr() string {
	parsed, err := url.Parse(c.RedisURL)
	if err != nil || parsed.Host == "" {
		return c.RedisURL
	}
	return parsed.Host
}

func GetConfig() *Config {
	return AppConfig
}
