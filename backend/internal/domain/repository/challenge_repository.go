package repository

import (
	"context"

	"nutrimind-backend/internal/domain/entity"
)

// ChallengeRepository handles persistence of Challenge records (catalogue).
type ChallengeRepository interface {
	BaseRepository[entity.Challenge]

	// FindAll returns all challenges in the catalogue.
	FindAll(ctx context.Context) ([]entity.Challenge, error)

	// FirstOrCreate finds a challenge by type+name or creates it.
	FirstOrCreate(ctx context.Context, challenge *entity.Challenge) error
}

// ChallengeEnrollmentRepository handles ChallengeEnrollment records.
type ChallengeEnrollmentRepository interface {
	BaseRepository[entity.ChallengeEnrollment]

	// FindActiveByUserAndChallenge returns the active enrollment for a user+challenge combo, or ErrNotFound.
	FindActiveByUserAndChallenge(ctx context.Context, userID, challengeID uint) (*entity.ChallengeEnrollment, error)

	// FindByUserAndChallenge returns ANY enrollment (any status) for a user+challenge.
	FindByUserAndChallenge(ctx context.Context, userID, challengeID uint) (*entity.ChallengeEnrollment, error)

	// FindActiveByUserID returns all active enrollments for a user.
	FindActiveByUserID(ctx context.Context, userID uint) ([]entity.ChallengeEnrollment, error)

	// FindAllActive returns all active enrollments across all users (used by scheduler).
	FindAllActive(ctx context.Context) ([]entity.ChallengeEnrollment, error)

	// CountActiveFriendsByChallengeIDs returns friend enrollment counts keyed by challenge_id.
	CountActiveFriendsByChallengeIDs(ctx context.Context, challengeIDs []uint, friendIDs []uint) (map[uint]int, error)

	// FindActiveByFriendsAndChallenge returns active enrollments for given friend IDs and challenge.
	FindActiveByFriendsAndChallenge(ctx context.Context, challengeID uint, friendIDs []uint) ([]entity.ChallengeEnrollment, error)
}

// ChallengeDailyCompletionRepository handles ChallengeDailyCompletion records.
type ChallengeDailyCompletionRepository interface {
	BaseRepository[entity.ChallengeDailyCompletion]

	// FindByEnrollmentID returns all daily completions for an enrollment, ordered by date ASC.
	FindByEnrollmentID(ctx context.Context, enrollmentID uint) ([]entity.ChallengeDailyCompletion, error)

	// CountMetGoalByEnrollmentID returns the number of days where met_goal = true.
	CountMetGoalByEnrollmentID(ctx context.Context, enrollmentID uint) (int64, error)

	// FindByEnrollmentIDs returns daily completions for multiple enrollments, ordered by date ASC.
	FindByEnrollmentIDs(ctx context.Context, enrollmentIDs []uint) ([]entity.ChallengeDailyCompletion, error)
}
