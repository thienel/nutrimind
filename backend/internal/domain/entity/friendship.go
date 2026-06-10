package entity

import "time"

const (
	FriendshipStatusPending  = "pending"
	FriendshipStatusAccepted = "accepted"
	FriendshipStatusDeclined = "declined"
)

type Friendship struct {
	ID          uint      `gorm:"primaryKey;autoIncrement"`
	RequesterID uint      `gorm:"column:requester_id;not null;index"`
	AddresseeID uint      `gorm:"column:addressee_id;not null;index"`
	Status      string    `gorm:"not null;default:pending"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
}
