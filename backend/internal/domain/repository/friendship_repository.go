package repository

import (
	"context"

	"nutrimind-backend/internal/domain/entity"
)

// FriendshipRepository handles persistence of Friendship records.
type FriendshipRepository interface {
	BaseRepository[entity.Friendship]

	// FindAnyBetween returns a friendship between two users regardless of direction and status.
	FindAnyBetween(ctx context.Context, userA, userB uint) (*entity.Friendship, error)

	// FindAcceptedByUserID returns all accepted friendships where the user is either requester or addressee.
	FindAcceptedByUserID(ctx context.Context, userID uint) ([]entity.Friendship, error)

	// FindPendingReceivedByUserID returns pending friendship requests where addressee = userID.
	FindPendingReceivedByUserID(ctx context.Context, userID uint) ([]entity.Friendship, error)
}
