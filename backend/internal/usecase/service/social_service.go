package service

import (
	"context"
	"time"
)

// --- Search ---

type UserSearchResult struct {
	UserID           uint
	DisplayName      string
	AvatarURL        string
	FriendshipStatus string // none | pending_sent | pending_received | accepted
}

// --- Friends ---

type SendFriendRequestResult struct {
	FriendshipID uint
	Status       string
}

type RespondFriendRequestResult struct {
	Status string
}

type FriendItem struct {
	UserID         uint
	DisplayName    string
	AvatarURL      string
	CurrentStreak  int
	LastActivityAt *time.Time
}

type PendingReceivedItem struct {
	FriendshipID uint
	UserID       uint
	DisplayName  string
	AvatarURL    string
	RequestedAt  time.Time
}

type GetFriendsResult struct {
	Friends         []FriendItem
	PendingReceived []PendingReceivedItem
}

// --- Feed ---

type MacroProgress struct {
	LoggedG float64
	TargetG float64
}

type FeedItem struct {
	UserID               uint
	DisplayName          string
	AvatarURL            string
	CurrentStreak        int
	CompletedAllGoalsToday bool
	CaloriesLogged       float64
	CaloriesTarget       float64
	Protein              MacroProgress
	Carb                 MacroProgress
	Fat                  MacroProgress
	WaterLoggedMl        int
	WaterTargetMl        int
	WeightLatestKg       float64
	WeightStartingKg     float64
	WeightAvailable      bool
	CheerSentToday       *string
	CheerCountToday      int
	LastActivityAt       *time.Time
}

type GetFeedResult struct {
	Date  time.Time
	Items []FeedItem
}

// --- Cheer ---

type SendCheerResult struct {
	Reaction        string
	CheerCountToday int
	CheerLimit      int
}

// --- Challenges ---

type EnrollmentSummary struct {
	EnrollmentID uint
	StartDate    time.Time
	EndDate      time.Time
	Status       string
	DayCurrent   int
	DayTotal     int
}

type CatalogueChallengeItem struct {
	ID              uint
	Name            string
	Type            string
	DurationDays    int
	Description     string
	FriendsEnrolled int
	MyEnrollment    *EnrollmentSummary
}

type GetChallengeCatalogueResult struct {
	Catalogue []CatalogueChallengeItem
}

type JoinChallengeResult struct {
	EnrollmentID uint
	StartDate    time.Time
	EndDate      time.Time
	Status       string
}

type DayGridItem struct {
	Date    time.Time
	MetGoal *bool // nil = today (in progress)
}

type ChallengeProgressMyResult struct {
	EnrollmentID uint
	StartDate    time.Time
	EndDate      time.Time
	DayCurrent   int
	DayTotal     int
	Grid         []DayGridItem
	BadgeAwarded bool
}

type FriendChallengeProgress struct {
	UserID      uint
	DisplayName string
	AvatarURL   string
	Grid        []DayGridItem
}

type GetChallengeProgressResult struct {
	ChallengeID   uint
	ChallengeName string
	ChallengeType string
	MyProgress    ChallengeProgressMyResult
	FriendsProgress []FriendChallengeProgress
}

// --- Leaderboard ---

type LeaderboardEntry struct {
	Rank           int
	UserID         uint
	DisplayName    string
	AvatarURL      string
	GoalsCompleted int
	IsMe           bool
}

type GetLeaderboardResult struct {
	WeekStart time.Time
	WeekEnd   time.Time
	Rankings  []LeaderboardEntry
}

// --- Service interface ---

type SocialService interface {
	SearchUsers(ctx context.Context, callerID uint, q string) ([]UserSearchResult, error)
	SendFriendRequest(ctx context.Context, requesterID, addresseeID uint) (*SendFriendRequestResult, error)
	RespondFriendRequest(ctx context.Context, userID, friendshipID uint, action string) (*RespondFriendRequestResult, error)
	CancelFriendRequest(ctx context.Context, userID, friendshipID uint) error
	RemoveFriend(ctx context.Context, userID, targetUserID uint) error
	GetFriends(ctx context.Context, userID uint) (*GetFriendsResult, error)
	GetFeed(ctx context.Context, userID uint) (*GetFeedResult, error)
	SendCheer(ctx context.Context, senderID, recipientID uint, reaction string) (*SendCheerResult, error)
	GetChallengeCatalogue(ctx context.Context, userID uint) (*GetChallengeCatalogueResult, error)
	JoinChallenge(ctx context.Context, userID, challengeID uint) (*JoinChallengeResult, error)
	GetChallengeProgress(ctx context.Context, userID, challengeID uint) (*GetChallengeProgressResult, error)
	AbandonChallenge(ctx context.Context, userID, challengeID uint) error
	GetLeaderboard(ctx context.Context, userID uint) (*GetLeaderboardResult, error)
}
