package serviceimpl

import (
	"context"
	"sort"
	"time"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/domain/repository"
	"nutrimind-backend/internal/infra/fcm"
	"nutrimind-backend/internal/usecase/service"
	apperror "nutrimind-backend/pkg/error"
)

// socialFCMSender is an optional dependency; nil = no push notifications.
type socialFCMSender interface {
	Send(ctx context.Context, token string, msg fcm.Message) error
}

type socialServiceImpl struct {
	profileRepo    repository.HealthProfileRepository
	userRepo       repository.UserRepository
	mealRepo       repository.MealEntryRepository
	waterRepo      repository.WaterEntryRepository
	weightRepo     repository.WeightEntryRepository
	friendshipRepo repository.FriendshipRepository
	challengeRepo  repository.ChallengeRepository
	enrollmentRepo repository.ChallengeEnrollmentRepository
	completionRepo repository.ChallengeDailyCompletionRepository
	cheerRepo      repository.CheerReactionRepository
	deviceRepo     repository.UserDeviceRepository
	notifRepo      repository.NotificationLogRepository
	fcm            socialFCMSender
}

// NewSocialService creates a new SocialService.
func NewSocialService(
	profileRepo repository.HealthProfileRepository,
	userRepo repository.UserRepository,
	mealRepo repository.MealEntryRepository,
	waterRepo repository.WaterEntryRepository,
	weightRepo repository.WeightEntryRepository,
	friendshipRepo repository.FriendshipRepository,
	challengeRepo repository.ChallengeRepository,
	enrollmentRepo repository.ChallengeEnrollmentRepository,
	completionRepo repository.ChallengeDailyCompletionRepository,
	cheerRepo repository.CheerReactionRepository,
	deviceRepo repository.UserDeviceRepository,
	notifRepo repository.NotificationLogRepository,
	fcmSender socialFCMSender,
) service.SocialService {
	return &socialServiceImpl{
		profileRepo:    profileRepo,
		userRepo:       userRepo,
		mealRepo:       mealRepo,
		waterRepo:      waterRepo,
		weightRepo:     weightRepo,
		friendshipRepo: friendshipRepo,
		challengeRepo:  challengeRepo,
		enrollmentRepo: enrollmentRepo,
		completionRepo: completionRepo,
		cheerRepo:      cheerRepo,
		deviceRepo:     deviceRepo,
		notifRepo:      notifRepo,
		fcm:            fcmSender,
	}
}

// checkSocialEnabled returns ErrOnboardingRequired if profile doesn't exist,
// ErrSocialDisabled if social is off, or propagates the DB error.
func (s *socialServiceImpl) checkSocialEnabled(ctx context.Context, userID uint) error {
	profile, err := s.profileRepo.FindByUserID(ctx, userID)
	if err != nil {
		// Nếu profile không tồn tại → ONBOARDING_REQUIRED
		// Các lỗi DB khác → propagate nguyên dạng
		if apperror.IsNotFound(err) {
			return apperror.ErrOnboardingRequired
		}
		return err
	}
	if !profile.SocialEnabled {
		return apperror.ErrSocialDisabled
	}
	return nil
}

// friendIDsOf extracts the peer user ID from a list of friendships for the given userID.
func friendIDsOf(friendships []entity.Friendship, userID uint) []uint {
	ids := make([]uint, 0, len(friendships))
	for _, f := range friendships {
		if f.RequesterID == userID {
			ids = append(ids, f.AddresseeID)
		} else {
			ids = append(ids, f.RequesterID)
		}
	}
	return ids
}

// computeStreak returns the number of consecutive days ending yesterday where
// the user met both calorie_target and water_target.
func (s *socialServiceImpl) computeStreak(ctx context.Context, userID uint, calorieTarget float64, waterTargetMl int) int {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	yesterday := today.AddDate(0, 0, -1)
	from := yesterday.AddDate(0, 0, -89) // check up to 90 days back

	mealSummaries, err := s.mealRepo.ListDailySummaryByDateRange(ctx, userID, from, yesterday)
	if err != nil {
		return 0
	}
	waterSummaries, err := s.waterRepo.ListDailySummaryByDateRange(ctx, userID, from, yesterday)
	if err != nil {
		return 0
	}

	mealMap := make(map[string]float64, len(mealSummaries))
	for _, m := range mealSummaries {
		mealMap[m.LoggedDate.UTC().Truncate(24*time.Hour).Format("2006-01-02")] = m.TotalCalories
	}
	waterMap := make(map[string]int, len(waterSummaries))
	for _, w := range waterSummaries {
		waterMap[w.LoggedDate.UTC().Truncate(24*time.Hour).Format("2006-01-02")] = w.TotalMl
	}

	streak := 0
	day := yesterday
	for i := 0; i < 90; i++ {
		key := day.Format("2006-01-02")
		calories := mealMap[key]
		water := waterMap[key]
		if calories <= calorieTarget && calories > 0 && water >= waterTargetMl {
			streak++
		} else {
			break
		}
		day = day.AddDate(0, 0, -1)
	}
	return streak
}

// sendSocialPush delivers a push notification and persists it in notification_logs (fire-and-forget).
func (s *socialServiceImpl) sendSocialPush(ctx context.Context, recipientID uint, title, body, deepLink string) {
	if s.fcm == nil || s.notifRepo == nil || s.deviceRepo == nil {
		return
	}
	devices, err := s.deviceRepo.FindByUserID(ctx, recipientID)
	if err != nil || len(devices) == 0 {
		return
	}

	count, err := s.notifRepo.CountByUserID(ctx, recipientID)
	if err == nil && count >= entity.MaxNotificationsPerUser {
		_ = s.notifRepo.DeleteOldestByUserID(ctx, recipientID)
	}

	dl := deepLink
	log := &entity.NotificationLog{
		UserID:           recipientID,
		NotificationType: entity.NotificationTypeSocial,
		Title:            title,
		Body:             body,
		DeepLink:         &dl,
		Status:           entity.NotificationStatusQueued,
		ScheduledAt:      time.Now(),
	}
	if err := s.notifRepo.Create(ctx, log); err != nil {
		return
	}

	for _, device := range devices {
		err := s.fcm.Send(ctx, device.FCMToken, fcm.Message{Title: title, Body: body, DeepLink: deepLink})
		if err == nil {
			_ = s.notifRepo.UpdateStatus(ctx, log.ID, entity.NotificationStatusDelivered, 0)
			return
		}
	}
	_ = s.notifRepo.UpdateStatus(ctx, log.ID, entity.NotificationStatusFailed, 1)
}

// ─── 10.1 SearchUsers ────────────────────────────────────────────────────────

func (s *socialServiceImpl) SearchUsers(ctx context.Context, callerID uint, q string) ([]service.UserSearchResult, error) {
	if err := s.checkSocialEnabled(ctx, callerID); err != nil {
		return nil, err
	}
	if q == "" {
		return []service.UserSearchResult{}, nil
	}
	users, err := s.userRepo.SearchSocial(ctx, q, callerID)
	if err != nil {
		return nil, err
	}

	// Batch-load all friendships for the caller.
	accepted, _ := s.friendshipRepo.FindAcceptedByUserID(ctx, callerID)
	pending, _ := s.friendshipRepo.FindPendingReceivedByUserID(ctx, callerID)

	statusMap := make(map[uint]string)
	for _, f := range accepted {
		peer := f.RequesterID
		if peer == callerID {
			peer = f.AddresseeID
		}
		statusMap[peer] = "accepted"
	}
	for _, f := range pending {
		statusMap[f.RequesterID] = "pending_received"
	}

	// Also check pending_sent (caller sent to someone).
	// We only have FindAcceptedByUserID and FindPendingReceivedByUserID.
	// For pending_sent we query directly on the friendship records we have.
	// Build a set of user IDs from search results, then query FindAnyBetween per user.
	// For simplicity we do a per-user check only for users not already mapped.
	results := make([]service.UserSearchResult, 0, len(users))
	for _, u := range users {
		status, ok := statusMap[u.ID]
		if !ok {
			// Check if caller sent a pending request to this user.
			f, err := s.friendshipRepo.FindAnyBetween(ctx, callerID, u.ID)
			if err == nil {
				switch f.Status {
				case entity.FriendshipStatusAccepted:
					status = "accepted"
				case entity.FriendshipStatusPending:
					if f.RequesterID == callerID {
						status = "pending_sent"
					} else {
						status = "pending_received"
					}
				default:
					status = "none"
				}
			} else {
				status = "none"
			}
		}
		results = append(results, service.UserSearchResult{
			UserID:           u.ID,
			DisplayName:      u.DisplayName,
			AvatarURL:        u.PhotoURL,
			FriendshipStatus: status,
		})
	}
	return results, nil
}

// ─── 10.2 SendFriendRequest ───────────────────────────────────────────────────

func (s *socialServiceImpl) SendFriendRequest(ctx context.Context, requesterID, addresseeID uint) (*service.SendFriendRequestResult, error) {
	if err := s.checkSocialEnabled(ctx, requesterID); err != nil {
		return nil, err
	}
	if requesterID == addresseeID {
		return nil, apperror.ErrValidation.WithMessage("Không thể gửi lời mời kết bạn cho chính mình")
	}
	if _, err := s.userRepo.FindByID(ctx, addresseeID); err != nil {
		return nil, apperror.ErrNotFound.WithMessage("Người dùng không tồn tại")
	}

	existing, err := s.friendshipRepo.FindAnyBetween(ctx, requesterID, addresseeID)
	if err == nil {
		switch existing.Status {
		case entity.FriendshipStatusAccepted:
			return nil, apperror.ErrAlreadyFriends
		case entity.FriendshipStatusPending:
			return nil, apperror.ErrRequestPending
		}
	}

	f := &entity.Friendship{
		RequesterID: requesterID,
		AddresseeID: addresseeID,
		Status:      entity.FriendshipStatusPending,
	}
	if err := s.friendshipRepo.Create(ctx, f); err != nil {
		return nil, err
	}

	// Notify addressee.
	requester, _ := s.userRepo.FindByID(ctx, requesterID)
	if requester != nil {
		s.sendSocialPush(ctx, addresseeID,
			"Lời mời kết bạn mới",
			requester.DisplayName+" gửi cho bạn một lời mời kết bạn trên NutriMind.",
			"nutrimind://social/friends",
		)
	}

	return &service.SendFriendRequestResult{
		FriendshipID: f.ID,
		Status:       f.Status,
	}, nil
}

// ─── 10.3 RespondFriendRequest ────────────────────────────────────────────────

func (s *socialServiceImpl) RespondFriendRequest(ctx context.Context, userID, friendshipID uint, action string) (*service.RespondFriendRequestResult, error) {
	if err := s.checkSocialEnabled(ctx, userID); err != nil {
		return nil, err
	}
	f, err := s.friendshipRepo.FindByID(ctx, friendshipID)
	if err != nil || f.Status != entity.FriendshipStatusPending {
		return nil, apperror.ErrNotFound.WithMessage("Lời mời không tồn tại hoặc không còn pending")
	}
	if f.AddresseeID != userID {
		return nil, apperror.ErrForbidden.WithMessage("Bạn không phải người nhận lời mời này")
	}

	switch action {
	case "accept":
		f.Status = entity.FriendshipStatusAccepted
	case "decline":
		f.Status = entity.FriendshipStatusDeclined
	default:
		return nil, apperror.ErrValidation.WithMessage("action phải là accept hoặc decline")
	}

	if err := s.friendshipRepo.Update(ctx, f); err != nil {
		return nil, err
	}
	return &service.RespondFriendRequestResult{Status: f.Status}, nil
}

// ─── 10.4 CancelFriendRequest ────────────────────────────────────────────────

func (s *socialServiceImpl) CancelFriendRequest(ctx context.Context, userID, friendshipID uint) error {
	if err := s.checkSocialEnabled(ctx, userID); err != nil {
		return err
	}
	f, err := s.friendshipRepo.FindByID(ctx, friendshipID)
	if err != nil {
		return apperror.ErrNotFound.WithMessage("Lời mời không tồn tại")
	}
	if f.RequesterID != userID {
		return apperror.ErrForbidden
	}
	if f.Status != entity.FriendshipStatusPending {
		return apperror.ErrNotFound.WithMessage("Lời mời không còn pending")
	}
	return s.friendshipRepo.Delete(ctx, friendshipID)
}

// ─── 10.5 RemoveFriend ───────────────────────────────────────────────────────

func (s *socialServiceImpl) RemoveFriend(ctx context.Context, userID, targetUserID uint) error {
	if err := s.checkSocialEnabled(ctx, userID); err != nil {
		return err
	}
	f, err := s.friendshipRepo.FindAnyBetween(ctx, userID, targetUserID)
	if err != nil || f.Status != entity.FriendshipStatusAccepted {
		return apperror.ErrNotFound.WithMessage("Không tìm thấy kết nối bạn bè")
	}
	return s.friendshipRepo.Delete(ctx, f.ID)
}

// ─── 10.6 GetFriends ─────────────────────────────────────────────────────────

func (s *socialServiceImpl) GetFriends(ctx context.Context, userID uint) (*service.GetFriendsResult, error) {
	if err := s.checkSocialEnabled(ctx, userID); err != nil {
		return nil, err
	}

	accepted, err := s.friendshipRepo.FindAcceptedByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	pendingReceived, err := s.friendshipRepo.FindPendingReceivedByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	friendIDs := friendIDsOf(accepted, userID)
	friends := make([]service.FriendItem, 0, len(friendIDs))

	if len(friendIDs) > 0 {
		users, _ := s.userRepo.FindByIDs(ctx, friendIDs)
		profiles, _ := s.profileRepo.FindByUserIDs(ctx, friendIDs)

		profileMap := make(map[uint]entity.HealthProfile, len(profiles))
		for _, p := range profiles {
			profileMap[p.UserID] = p
		}
		userMap := make(map[uint]entity.User, len(users))
		for _, u := range users {
			userMap[u.ID] = u
		}

		for _, fid := range friendIDs {
			u, ok := userMap[fid]
			if !ok {
				continue
			}
			p := profileMap[fid]
			streak := s.computeStreak(ctx, fid, p.CalorieTarget, p.WaterTargetMl)
			friends = append(friends, service.FriendItem{
				UserID:         fid,
				DisplayName:    u.DisplayName,
				AvatarURL:      u.PhotoURL,
				CurrentStreak:  streak,
				LastActivityAt: u.LastActivityAt,
			})
		}
	}

	requesterIDs := make([]uint, 0, len(pendingReceived))
	for _, f := range pendingReceived {
		requesterIDs = append(requesterIDs, f.RequesterID)
	}
	pendingUsers, _ := s.userRepo.FindByIDs(ctx, requesterIDs)
	userMap2 := make(map[uint]entity.User, len(pendingUsers))
	for _, u := range pendingUsers {
		userMap2[u.ID] = u
	}

	pendingItems := make([]service.PendingReceivedItem, 0, len(pendingReceived))
	for _, f := range pendingReceived {
		u := userMap2[f.RequesterID]
		pendingItems = append(pendingItems, service.PendingReceivedItem{
			FriendshipID: f.ID,
			UserID:       f.RequesterID,
			DisplayName:  u.DisplayName,
			AvatarURL:    u.PhotoURL,
			RequestedAt:  f.CreatedAt,
		})
	}

	return &service.GetFriendsResult{
		Friends:         friends,
		PendingReceived: pendingItems,
	}, nil
}

// ─── 10.7 GetFeed ────────────────────────────────────────────────────────────

func (s *socialServiceImpl) GetFeed(ctx context.Context, userID uint) (*service.GetFeedResult, error) {
	if err := s.checkSocialEnabled(ctx, userID); err != nil {
		return nil, err
	}

	accepted, err := s.friendshipRepo.FindAcceptedByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	friendIDs := friendIDsOf(accepted, userID)

	today := time.Now().UTC().Truncate(24 * time.Hour)
	todayDate := today

	items := make([]service.FeedItem, 0)

	if len(friendIDs) > 0 {
		profiles, _ := s.profileRepo.FindByUserIDs(ctx, friendIDs)
		profileMap := make(map[uint]entity.HealthProfile, len(profiles))
		for _, p := range profiles {
			profileMap[p.UserID] = p
		}

		// Filter to social-enabled friends only.
		socialFriendIDs := make([]uint, 0, len(friendIDs))
		for _, fid := range friendIDs {
			if p, ok := profileMap[fid]; ok && p.SocialEnabled {
				socialFriendIDs = append(socialFriendIDs, fid)
			}
		}

		users, _ := s.userRepo.FindByIDs(ctx, socialFriendIDs)
		userMap := make(map[uint]entity.User, len(users))
		for _, u := range users {
			userMap[u.ID] = u
		}

		// Bulk cheer data.
		cheersFromMe, _ := s.cheerRepo.FindSentTodayBulk(ctx, userID, socialFriendIDs, todayDate)
		cheerFromMeMap := make(map[uint]string) // recipient → reaction
		seen := make(map[uint]bool)
		for _, c := range cheersFromMe {
			if !seen[c.RecipientID] {
				cheerFromMeMap[c.RecipientID] = c.Reaction
				seen[c.RecipientID] = true
			}
		}
		cheerCounts, _ := s.cheerRepo.CountReceivedTodayBulk(ctx, socialFriendIDs, todayDate)

		for _, fid := range socialFriendIDs {
			u, ok := userMap[fid]
			if !ok {
				continue
			}
			p := profileMap[fid]

			macros, _ := s.mealRepo.SumMacrosByUserIDAndDate(ctx, fid, todayDate)
			waterTotal, _ := s.waterRepo.SumByUserIDAndDate(ctx, fid, todayDate)
			streak := s.computeStreak(ctx, fid, p.CalorieTarget, p.WaterTargetMl)

			// Weight progress.
			var latestKg, startingKg float64
			weightAvailable := false
			if we, err := s.weightRepo.FindLatestByUserID(ctx, fid); err == nil {
				latestKg = we.WeightKg
				startingKg = p.WeightKg // onboarding weight as starting point
				weightAvailable = true
			}

			// completed_all_goals_today: calories within target AND water at/above target.
			completedAll := p.CalorieTarget > 0 &&
				macros.TotalCalories <= p.CalorieTarget &&
				macros.TotalCalories > 0 &&
				waterTotal >= p.WaterTargetMl

			var cheerSent *string
			if r, ok := cheerFromMeMap[fid]; ok {
				cheerSent = &r
			}

			items = append(items, service.FeedItem{
				UserID:               fid,
				DisplayName:          u.DisplayName,
				AvatarURL:            u.PhotoURL,
				CurrentStreak:        streak,
				CompletedAllGoalsToday: completedAll,
				CaloriesLogged:       round2(macros.TotalCalories),
				CaloriesTarget:       round2(p.CalorieTarget),
				Protein:              service.MacroProgress{LoggedG: round2(macros.TotalProteinG), TargetG: round2(p.ProteinTargetG)},
				Carb:                 service.MacroProgress{LoggedG: round2(macros.TotalCarbG), TargetG: round2(p.CarbTargetG)},
				Fat:                  service.MacroProgress{LoggedG: round2(macros.TotalFatG), TargetG: round2(p.FatTargetG)},
				WaterLoggedMl:        waterTotal,
				WaterTargetMl:        p.WaterTargetMl,
				WeightLatestKg:       latestKg,
				WeightStartingKg:     startingKg,
				WeightAvailable:      weightAvailable,
				CheerSentToday:       cheerSent,
				CheerCountToday:      int(cheerCounts[fid]),
				LastActivityAt:       u.LastActivityAt,
			})
		}

		// Sort by last_activity_at DESC (nil last).
		sort.Slice(items, func(i, j int) bool {
			ai, aj := items[i].LastActivityAt, items[j].LastActivityAt
			if ai == nil {
				return false
			}
			if aj == nil {
				return true
			}
			return ai.After(*aj)
		})
	}

	return &service.GetFeedResult{
		Date:  todayDate,
		Items: items,
	}, nil
}

// ─── 10.8 SendCheer ──────────────────────────────────────────────────────────

func (s *socialServiceImpl) SendCheer(ctx context.Context, senderID, recipientID uint, reaction string) (*service.SendCheerResult, error) {
	if err := s.checkSocialEnabled(ctx, senderID); err != nil {
		return nil, err
	}

	// Must be friends.
	f, err := s.friendshipRepo.FindAnyBetween(ctx, senderID, recipientID)
	if err != nil || f.Status != entity.FriendshipStatusAccepted {
		return nil, apperror.ErrForbidden.WithMessage("Không phải bạn bè")
	}

	today := time.Now().UTC().Truncate(24 * time.Hour)
	count, _ := s.cheerRepo.CountSentToday(ctx, senderID, recipientID, today)
	if count >= entity.CheerRateLimit {
		return nil, apperror.ErrCheerRateLimit
	}

	cheer := &entity.CheerReaction{
		SenderID:    senderID,
		RecipientID: recipientID,
		Reaction:    reaction,
		SentDate:    today,
	}
	if err := s.cheerRepo.Create(ctx, cheer); err != nil {
		return nil, err
	}

	totalReceived, _ := s.cheerRepo.CountReceivedToday(ctx, recipientID, today)

	// Notify recipient.
	sender, _ := s.userRepo.FindByID(ctx, senderID)
	if sender != nil {
		reactionLabel := map[string]string{
			entity.ReactionKeepGoing:     "💪 Keep Going!",
			entity.ReactionNiceJob:       "👏 Nice Job!",
			entity.ReactionGreatProgress: "🎉 Great Progress!",
		}[reaction]
		s.sendSocialPush(ctx, recipientID,
			"Bạn nhận được cheer!",
			sender.DisplayName+" đã cổ vũ bạn: "+reactionLabel,
			"nutrimind://social/feed",
		)
	}

	return &service.SendCheerResult{
		Reaction:        reaction,
		CheerCountToday: int(totalReceived),
		CheerLimit:      entity.CheerRateLimit,
	}, nil
}

// ─── 10.9 GetChallengeCatalogue ───────────────────────────────────────────────

func (s *socialServiceImpl) GetChallengeCatalogue(ctx context.Context, userID uint) (*service.GetChallengeCatalogueResult, error) {
	if err := s.checkSocialEnabled(ctx, userID); err != nil {
		return nil, err
	}

	challenges, err := s.challengeRepo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	accepted, _ := s.friendshipRepo.FindAcceptedByUserID(ctx, userID)
	friendIDs := friendIDsOf(accepted, userID)

	challengeIDs := make([]uint, 0, len(challenges))
	for _, c := range challenges {
		challengeIDs = append(challengeIDs, c.ID)
	}

	friendCounts, _ := s.enrollmentRepo.CountActiveFriendsByChallengeIDs(ctx, challengeIDs, friendIDs)
	myEnrollments, _ := s.enrollmentRepo.FindActiveByUserID(ctx, userID)
	myEnrollMap := make(map[uint]entity.ChallengeEnrollment, len(myEnrollments))
	for _, e := range myEnrollments {
		myEnrollMap[e.ChallengeID] = e
	}

	today := time.Now().UTC().Truncate(24 * time.Hour)
	catalogue := make([]service.CatalogueChallengeItem, 0, len(challenges))
	for _, c := range challenges {
		item := service.CatalogueChallengeItem{
			ID:              c.ID,
			Name:            c.Name,
			Type:            c.Type,
			DurationDays:    c.DurationDays,
			Description:     c.Description,
			FriendsEnrolled: friendCounts[c.ID],
		}
		if e, ok := myEnrollMap[c.ID]; ok {
			dayCurrent := int(today.Sub(e.StartDate.UTC().Truncate(24*time.Hour)).Hours()/24) + 1
			if dayCurrent < 1 {
				dayCurrent = 1
			}
			if dayCurrent > c.DurationDays {
				dayCurrent = c.DurationDays
			}
			item.MyEnrollment = &service.EnrollmentSummary{
				EnrollmentID: e.ID,
				StartDate:    e.StartDate,
				EndDate:      e.EndDate,
				Status:       e.Status,
				DayCurrent:   dayCurrent,
				DayTotal:     c.DurationDays,
			}
		}
		catalogue = append(catalogue, item)
	}

	return &service.GetChallengeCatalogueResult{Catalogue: catalogue}, nil
}

// ─── 10.10 JoinChallenge ─────────────────────────────────────────────────────

func (s *socialServiceImpl) JoinChallenge(ctx context.Context, userID, challengeID uint) (*service.JoinChallengeResult, error) {
	if err := s.checkSocialEnabled(ctx, userID); err != nil {
		return nil, err
	}

	challenge, err := s.challengeRepo.FindByID(ctx, challengeID)
	if err != nil {
		return nil, apperror.ErrNotFound.WithMessage("Challenge không tồn tại")
	}

	_, err = s.enrollmentRepo.FindActiveByUserAndChallenge(ctx, userID, challengeID)
	if err == nil {
		return nil, apperror.ErrChallengeAlreadyEnrolled
	}

	tomorrow := time.Now().UTC().Truncate(24*time.Hour).AddDate(0, 0, 1)
	endDate := tomorrow.AddDate(0, 0, challenge.DurationDays-1)

	enrollment := &entity.ChallengeEnrollment{
		UserID:      userID,
		ChallengeID: challengeID,
		StartDate:   tomorrow,
		EndDate:     endDate,
		Status:      entity.EnrollmentStatusActive,
	}
	if err := s.enrollmentRepo.Create(ctx, enrollment); err != nil {
		return nil, err
	}

	// Notify enrolled friends.
	accepted, _ := s.friendshipRepo.FindAcceptedByUserID(ctx, userID)
	friendIDs := friendIDsOf(accepted, userID)
	friendEnrollments, _ := s.enrollmentRepo.FindActiveByFriendsAndChallenge(ctx, challengeID, friendIDs)
	joiner, _ := s.userRepo.FindByID(ctx, userID)
	if joiner != nil && len(friendEnrollments) > 0 {
		notified := make(map[uint]bool)
		for _, fe := range friendEnrollments {
			if !notified[fe.UserID] {
				s.sendSocialPush(ctx, fe.UserID,
					"Bạn bè tham gia challenge!",
					joiner.DisplayName+" vừa tham gia "+challenge.Name+"!",
					"nutrimind://social/challenges",
				)
				notified[fe.UserID] = true
			}
		}
	}

	return &service.JoinChallengeResult{
		EnrollmentID: enrollment.ID,
		StartDate:    enrollment.StartDate,
		EndDate:      enrollment.EndDate,
		Status:       enrollment.Status,
	}, nil
}

// ─── 10.11 GetChallengeProgress ───────────────────────────────────────────────

func (s *socialServiceImpl) GetChallengeProgress(ctx context.Context, userID, challengeID uint) (*service.GetChallengeProgressResult, error) {
	if err := s.checkSocialEnabled(ctx, userID); err != nil {
		return nil, err
	}

	challenge, err := s.challengeRepo.FindByID(ctx, challengeID)
	if err != nil {
		return nil, apperror.ErrNotFound.WithMessage("Challenge không tồn tại")
	}

	myEnrollment, err := s.enrollmentRepo.FindActiveByUserAndChallenge(ctx, userID, challengeID)
	if err != nil {
		// Also check completed/abandoned enrollments.
		myEnrollment, err = s.enrollmentRepo.FindByUserAndChallenge(ctx, userID, challengeID)
		if err != nil {
			return nil, apperror.ErrNotFound.WithMessage("Bạn chưa tham gia challenge này")
		}
	}

	today := time.Now().UTC().Truncate(24 * time.Hour)
	myCompletions, _ := s.completionRepo.FindByEnrollmentID(ctx, myEnrollment.ID)
	completionMap := make(map[string]bool, len(myCompletions))
	for _, c := range myCompletions {
		completionMap[c.CompletionDate.UTC().Truncate(24*time.Hour).Format("2006-01-02")] = c.MetGoal
	}

	// Build grid from start_date to end_date.
	dayCurrent := int(today.Sub(myEnrollment.StartDate.UTC().Truncate(24*time.Hour)).Hours()/24) + 1
	if dayCurrent < 1 {
		dayCurrent = 1
	}
	if dayCurrent > challenge.DurationDays {
		dayCurrent = challenge.DurationDays
	}

	grid := make([]service.DayGridItem, 0, challenge.DurationDays)
	for i := 0; i < challenge.DurationDays; i++ {
		day := myEnrollment.StartDate.UTC().Truncate(24 * time.Hour).AddDate(0, 0, i)
		key := day.Format("2006-01-02")
		var metGoal *bool
		if day.Before(today) {
			v := completionMap[key]
			metGoal = &v
		}
		// today → metGoal = nil (in progress)
		grid = append(grid, service.DayGridItem{Date: day, MetGoal: metGoal})
	}

	myProgress := service.ChallengeProgressMyResult{
		EnrollmentID: myEnrollment.ID,
		StartDate:    myEnrollment.StartDate,
		EndDate:      myEnrollment.EndDate,
		DayCurrent:   dayCurrent,
		DayTotal:     challenge.DurationDays,
		Grid:         grid,
		BadgeAwarded: myEnrollment.BadgeAwarded,
	}

	// Friends' progress.
	accepted, _ := s.friendshipRepo.FindAcceptedByUserID(ctx, userID)
	friendIDs := friendIDsOf(accepted, userID)
	friendEnrollments, _ := s.enrollmentRepo.FindActiveByFriendsAndChallenge(ctx, challengeID, friendIDs)

	var friendsProgress []service.FriendChallengeProgress
	if len(friendEnrollments) > 0 {
		enrollIDs := make([]uint, 0, len(friendEnrollments))
		for _, fe := range friendEnrollments {
			enrollIDs = append(enrollIDs, fe.ID)
		}
		allCompletions, _ := s.completionRepo.FindByEnrollmentIDs(ctx, enrollIDs)

		fEnrollMap := make(map[uint]entity.ChallengeEnrollment, len(friendEnrollments))
		for _, fe := range friendEnrollments {
			fEnrollMap[fe.UserID] = fe
		}
		fCompletionMap := make(map[uint]map[string]bool)
		for _, c := range allCompletions {
			// Find which enrollment this belongs to by matching enrollment_id.
			for _, fe := range friendEnrollments {
				if fe.ID == c.EnrollmentID {
					if fCompletionMap[fe.UserID] == nil {
						fCompletionMap[fe.UserID] = make(map[string]bool)
					}
					fCompletionMap[fe.UserID][c.CompletionDate.UTC().Truncate(24*time.Hour).Format("2006-01-02")] = c.MetGoal
					break
				}
			}
		}

		fEnrollFriendIDs := make([]uint, 0, len(friendEnrollments))
		for _, fe := range friendEnrollments {
			fEnrollFriendIDs = append(fEnrollFriendIDs, fe.UserID)
		}
		fUsers, _ := s.userRepo.FindByIDs(ctx, fEnrollFriendIDs)
		fUserMap := make(map[uint]entity.User, len(fUsers))
		for _, u := range fUsers {
			fUserMap[u.ID] = u
		}

		for _, fe := range friendEnrollments {
			u := fUserMap[fe.UserID]
			fGrid := make([]service.DayGridItem, 0, challenge.DurationDays)
			cm := fCompletionMap[fe.UserID]
			for i := 0; i < challenge.DurationDays; i++ {
				day := fe.StartDate.UTC().Truncate(24 * time.Hour).AddDate(0, 0, i)
				key := day.Format("2006-01-02")
				var metGoal *bool
				if day.Before(today) {
					v := cm[key]
					metGoal = &v
				}
				fGrid = append(fGrid, service.DayGridItem{Date: day, MetGoal: metGoal})
			}
			friendsProgress = append(friendsProgress, service.FriendChallengeProgress{
				UserID:      fe.UserID,
				DisplayName: u.DisplayName,
				AvatarURL:   u.PhotoURL,
				Grid:        fGrid,
			})
		}
	}

	return &service.GetChallengeProgressResult{
		ChallengeID:     challenge.ID,
		ChallengeName:   challenge.Name,
		ChallengeType:   challenge.Type,
		MyProgress:      myProgress,
		FriendsProgress: friendsProgress,
	}, nil
}

// ─── 10.12 AbandonChallenge ───────────────────────────────────────────────────

func (s *socialServiceImpl) AbandonChallenge(ctx context.Context, userID, challengeID uint) error {
	if err := s.checkSocialEnabled(ctx, userID); err != nil {
		return err
	}
	enrollment, err := s.enrollmentRepo.FindActiveByUserAndChallenge(ctx, userID, challengeID)
	if err != nil {
		return apperror.ErrNotFound.WithMessage("Không tìm thấy enrollment đang active")
	}
	enrollment.Status = entity.EnrollmentStatusAbandoned
	return s.enrollmentRepo.Update(ctx, enrollment)
}

// ─── 10.14 GetLeaderboard ────────────────────────────────────────────────────

func (s *socialServiceImpl) GetLeaderboard(ctx context.Context, userID uint) (*service.GetLeaderboardResult, error) {
	if err := s.checkSocialEnabled(ctx, userID); err != nil {
		return nil, err
	}

	accepted, _ := s.friendshipRepo.FindAcceptedByUserID(ctx, userID)
	friendIDs := friendIDsOf(accepted, userID)

	// Include self in leaderboard.
	allIDs := append([]uint{userID}, friendIDs...)

	profiles, _ := s.profileRepo.FindByUserIDs(ctx, allIDs)
	profileMap := make(map[uint]entity.HealthProfile, len(profiles))
	for _, p := range profiles {
		profileMap[p.UserID] = p
	}

	users, _ := s.userRepo.FindByIDs(ctx, allIDs)
	userMap := make(map[uint]entity.User, len(users))
	for _, u := range users {
		userMap[u.ID] = u
	}

	// Compute week window: Monday 00:00 → yesterday.
	now := time.Now().UTC()
	today := now.Truncate(24 * time.Hour)
	weekday := int(today.Weekday())
	if weekday == 0 {
		weekday = 7 // Sunday = 7
	}
	weekStart := today.AddDate(0, 0, -(weekday - 1)) // Monday
	weekEnd := today.AddDate(0, 0, 6-(weekday-1))    // Sunday
	yesterday := today.AddDate(0, 0, -1)

	entries := make([]service.LeaderboardEntry, 0, len(allIDs))
	for _, uid := range allIDs {
		p := profileMap[uid]
		u := userMap[uid]

		// Only include users with social_enabled (or self).
		if uid != userID && !p.SocialEnabled {
			continue
		}

		goalsCompleted := 0
		mealSummaries, _ := s.mealRepo.ListDailySummaryByDateRange(ctx, uid, weekStart, yesterday)
		waterSummaries, _ := s.waterRepo.ListDailySummaryByDateRange(ctx, uid, weekStart, yesterday)

		mealMap := make(map[string]float64, len(mealSummaries))
		for _, m := range mealSummaries {
			mealMap[m.LoggedDate.UTC().Truncate(24*time.Hour).Format("2006-01-02")] = m.TotalCalories
		}
		waterMap := make(map[string]int, len(waterSummaries))
		for _, w := range waterSummaries {
			waterMap[w.LoggedDate.UTC().Truncate(24*time.Hour).Format("2006-01-02")] = w.TotalMl
		}

		for day := weekStart; !day.After(yesterday); day = day.AddDate(0, 0, 1) {
			key := day.Format("2006-01-02")
			cal := mealMap[key]
			water := waterMap[key]
			if p.CalorieTarget > 0 && cal > 0 && cal <= p.CalorieTarget {
				goalsCompleted++
			}
			if p.WaterTargetMl > 0 && water >= p.WaterTargetMl {
				goalsCompleted++
			}
		}

		entries = append(entries, service.LeaderboardEntry{
			UserID:         uid,
			DisplayName:    u.DisplayName,
			AvatarURL:      u.PhotoURL,
			GoalsCompleted: goalsCompleted,
			IsMe:           uid == userID,
		})
	}

	// Sort: goals_completed DESC, then display_name ASC.
	sort.Slice(entries, func(i, j int) bool {
		if entries[i].GoalsCompleted != entries[j].GoalsCompleted {
			return entries[i].GoalsCompleted > entries[j].GoalsCompleted
		}
		return entries[i].DisplayName < entries[j].DisplayName
	})
	for i := range entries {
		entries[i].Rank = i + 1
	}

	return &service.GetLeaderboardResult{
		WeekStart: weekStart,
		WeekEnd:   weekEnd,
		Rankings:  entries,
	}, nil
}

var _ service.SocialService = (*socialServiceImpl)(nil)
