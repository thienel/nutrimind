package dto

import "time"

// ── Search ──────────────────────────────────────────────────────────────────

type UserSearchItemResponse struct {
	UserID           uint   `json:"user_id"`
	DisplayName      string `json:"display_name"`
	AvatarURL        string `json:"avatar_url"`
	FriendshipStatus string `json:"friendship_status"`
}

type SearchUsersResponse struct {
	Items []UserSearchItemResponse `json:"items"`
}

// ── Friends ──────────────────────────────────────────────────────────────────

type SendFriendRequestRequest struct {
	AddresseeID uint `json:"addressee_id" binding:"required"`
}

type SendFriendRequestResponse struct {
	FriendshipID uint   `json:"friendship_id"`
	Status       string `json:"status"`
}

type RespondFriendRequestRequest struct {
	Action string `json:"action" binding:"required,oneof=accept decline"`
}

type RespondFriendRequestResponse struct {
	Status string `json:"status"`
}

type FriendItemResponse struct {
	UserID         uint       `json:"user_id"`
	DisplayName    string     `json:"display_name"`
	AvatarURL      string     `json:"avatar_url"`
	CurrentStreak  int        `json:"current_streak"`
	LastActivityAt *time.Time `json:"last_activity_at"`
}

type PendingReceivedItemResponse struct {
	FriendshipID uint      `json:"friendship_id"`
	UserID       uint      `json:"user_id"`
	DisplayName  string    `json:"display_name"`
	AvatarURL    string    `json:"avatar_url"`
	RequestedAt  time.Time `json:"requested_at"`
}

type GetFriendsResponse struct {
	Friends         []FriendItemResponse          `json:"friends"`
	PendingReceived []PendingReceivedItemResponse `json:"pending_received"`
}

// ── Feed ─────────────────────────────────────────────────────────────────────

type MacroProgressResponse struct {
	LoggedG float64 `json:"logged_g"`
	TargetG float64 `json:"target_g"`
}

type WeightProgressResponse struct {
	LatestKg   float64 `json:"latest_kg"`
	StartingKg float64 `json:"starting_kg"`
	Available  bool    `json:"available"`
}

type CaloriesProgressResponse struct {
	Logged float64 `json:"logged"`
	Target float64 `json:"target"`
}

type WaterProgressResponse struct {
	LoggedMl int `json:"logged_ml"`
	TargetMl int `json:"target_ml"`
}

type MacrosResponse struct {
	Protein MacroProgressResponse `json:"protein"`
	Carb    MacroProgressResponse `json:"carb"`
	Fat     MacroProgressResponse `json:"fat"`
}

type FeedItemResponse struct {
	UserID               uint                     `json:"user_id"`
	DisplayName          string                   `json:"display_name"`
	AvatarURL            string                   `json:"avatar_url"`
	CurrentStreak        int                      `json:"current_streak"`
	CompletedAllGoalsToday bool                   `json:"completed_all_goals_today"`
	Calories             CaloriesProgressResponse `json:"calories"`
	Macros               MacrosResponse           `json:"macros"`
	Water                WaterProgressResponse    `json:"water"`
	WeightProgress       WeightProgressResponse   `json:"weight_progress"`
	CheerSentToday       *string                  `json:"cheer_sent_today"`
	CheerCountToday      int                      `json:"cheer_count_today"`
	LastActivityAt       *time.Time               `json:"last_activity_at"`
}

type GetFeedResponse struct {
	Date  string             `json:"date"`
	Items []FeedItemResponse `json:"items"`
}

// ── Cheer ─────────────────────────────────────────────────────────────────────

type SendCheerRequest struct {
	RecipientID uint   `json:"recipient_id" binding:"required"`
	Reaction    string `json:"reaction" binding:"required,oneof=keep_going nice_job great_progress"`
}

type SendCheerResponse struct {
	Reaction        string `json:"reaction"`
	CheerCountToday int    `json:"cheer_count_today"`
	CheerLimit      int    `json:"cheer_limit"`
}

// ── Challenges ────────────────────────────────────────────────────────────────

type EnrollmentSummaryResponse struct {
	EnrollmentID uint      `json:"enrollment_id"`
	StartDate    string    `json:"start_date"`
	EndDate      string    `json:"end_date"`
	Status       string    `json:"status"`
	DayCurrent   int       `json:"day_current"`
	DayTotal     int       `json:"day_total"`
}

type CatalogueChallengeItemResponse struct {
	ID              uint                       `json:"id"`
	Name            string                     `json:"name"`
	Type            string                     `json:"type"`
	DurationDays    int                        `json:"duration_days"`
	Description     string                     `json:"description"`
	FriendsEnrolled int                        `json:"friends_enrolled"`
	MyEnrollment    *EnrollmentSummaryResponse `json:"my_enrollment"`
}

type GetChallengeCatalogueResponse struct {
	Catalogue []CatalogueChallengeItemResponse `json:"catalogue"`
}

type JoinChallengeResponse struct {
	EnrollmentID uint   `json:"enrollment_id"`
	StartDate    string `json:"start_date"`
	EndDate      string `json:"end_date"`
	Status       string `json:"status"`
}

type DayGridItemResponse struct {
	Date    string `json:"date"`
	MetGoal *bool  `json:"met_goal"`
}

type ChallengeInfoResponse struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"`
}

type MyProgressResponse struct {
	EnrollmentID uint                  `json:"enrollment_id"`
	StartDate    string                `json:"start_date"`
	EndDate      string                `json:"end_date"`
	DayCurrent   int                   `json:"day_current"`
	DayTotal     int                   `json:"day_total"`
	Grid         []DayGridItemResponse `json:"grid"`
	BadgeAwarded bool                  `json:"badge_awarded"`
}

type FriendProgressResponse struct {
	UserID      uint                  `json:"user_id"`
	DisplayName string                `json:"display_name"`
	AvatarURL   string                `json:"avatar_url"`
	Grid        []DayGridItemResponse `json:"grid"`
}

type GetChallengeProgressResponse struct {
	Challenge       ChallengeInfoResponse    `json:"challenge"`
	MyProgress      MyProgressResponse       `json:"my_progress"`
	FriendsProgress []FriendProgressResponse `json:"friends_progress"`
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

type LeaderboardEntryResponse struct {
	Rank           int    `json:"rank"`
	UserID         uint   `json:"user_id"`
	DisplayName    string `json:"display_name"`
	AvatarURL      string `json:"avatar_url"`
	GoalsCompleted int    `json:"goals_completed"`
	IsMe           bool   `json:"is_me"`
}

type GetLeaderboardResponse struct {
	WeekStart string                     `json:"week_start"`
	WeekEnd   string                     `json:"week_end"`
	Note      string                     `json:"note"`
	Rankings  []LeaderboardEntryResponse `json:"rankings"`
}
