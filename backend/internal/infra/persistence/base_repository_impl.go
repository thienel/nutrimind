package persistence

import (
	"gorm.io/gorm"
)

// BaseRepositoryImpl holds the shared *gorm.DB
type BaseRepositoryImpl struct {
	DB            *gorm.DB
	AllowedFields map[string]bool
	EntityName    string
}

// NewBaseRepository creates a new base repository
func NewBaseRepository(db *gorm.DB, allowedFields map[string]bool, entityName string) *BaseRepositoryImpl {
	return &BaseRepositoryImpl{
		DB:            db,
		AllowedFields: allowedFields,
		EntityName:    entityName,
	}
}
