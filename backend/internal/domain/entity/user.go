package entity

import (
	"time"

	"gorm.io/gorm"
)

// User roles
const (
	UserRoleUser  = "USER"
	UserRoleAdmin = "ADMIN"
)

// User statuses
const (
	UserStatusActive   = "ACTIVE"
	UserStatusInactive = "INACTIVE"
)

// User is the GORM model for the users table.
// gorm.Model provides: ID (uint), CreatedAt, UpdatedAt, DeletedAt (soft delete).
type User struct {
	gorm.Model
	GoogleID       string     `gorm:"uniqueIndex;not null"`
	Email          string     `gorm:"uniqueIndex;not null"`
	DisplayName    string     `gorm:"not null"`
	PhotoURL       string
	Role           string     `gorm:"default:USER;not null"`
	Status         string     `gorm:"default:ACTIVE;not null"`
	LastActivityAt *time.Time `gorm:"column:last_activity_at"`
}

// IsValidUserRole checks if the role is valid
func IsValidUserRole(role string) bool {
	switch role {
	case UserRoleUser, UserRoleAdmin:
		return true
	default:
		return false
	}
}

// IsValidUserStatus checks if the status is valid
func IsValidUserStatus(status string) bool {
	switch status {
	case UserStatusActive, UserStatusInactive:
		return true
	default:
		return false
	}
}
