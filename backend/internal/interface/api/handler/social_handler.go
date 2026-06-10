package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"nutrimind-backend/internal/interface/api/dto"
	"nutrimind-backend/internal/interface/api/middleware"
	"nutrimind-backend/internal/usecase/service"
	apperror "nutrimind-backend/pkg/error"
	"nutrimind-backend/pkg/response"
)

const dateLayout = "2006-01-02"

// SocialHandler defines HTTP handlers for social features.
type SocialHandler interface {
	SearchUsers(c *gin.Context)
	SendFriendRequest(c *gin.Context)
	RespondFriendRequest(c *gin.Context)
	CancelFriendRequest(c *gin.Context)
	RemoveFriend(c *gin.Context)
	GetFriends(c *gin.Context)
	GetFeed(c *gin.Context)
	SendCheer(c *gin.Context)
	GetChallengeCatalogue(c *gin.Context)
	JoinChallenge(c *gin.Context)
	GetChallengeProgress(c *gin.Context)
	AbandonChallenge(c *gin.Context)
	GetLeaderboard(c *gin.Context)
}

type socialHandlerImpl struct {
	svc service.SocialService
}

func NewSocialHandler(svc service.SocialService) SocialHandler {
	return &socialHandlerImpl{svc: svc}
}

func (h *socialHandlerImpl) SearchUsers(c *gin.Context) {
	q := c.Query("q")
	if q == "" {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage("q là bắt buộc"))
		return
	}
	userID := middleware.GetUserID(c)
	results, err := h.svc.SearchUsers(c.Request.Context(), userID, q)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}
	items := make([]dto.UserSearchItemResponse, 0, len(results))
	for _, r := range results {
		items = append(items, dto.UserSearchItemResponse{
			UserID:           r.UserID,
			DisplayName:      r.DisplayName,
			AvatarURL:        r.AvatarURL,
			FriendshipStatus: r.FriendshipStatus,
		})
	}
	response.OK(c, dto.SearchUsersResponse{Items: items}, "")
}

func (h *socialHandlerImpl) SendFriendRequest(c *gin.Context) {
	var req dto.SendFriendRequestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage(err.Error()))
		return
	}
	userID := middleware.GetUserID(c)
	result, err := h.svc.SendFriendRequest(c.Request.Context(), userID, req.AddresseeID)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}
	response.Created(c, dto.SendFriendRequestResponse{
		FriendshipID: result.FriendshipID,
		Status:       result.Status,
	}, "")
}

func (h *socialHandlerImpl) RespondFriendRequest(c *gin.Context) {
	friendshipID, err := parseUintParam(c, "friendship_id")
	if err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage("friendship_id không hợp lệ"))
		return
	}
	var req dto.RespondFriendRequestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage(err.Error()))
		return
	}
	userID := middleware.GetUserID(c)
	result, err := h.svc.RespondFriendRequest(c.Request.Context(), userID, friendshipID, req.Action)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}
	response.OK(c, dto.RespondFriendRequestResponse{Status: result.Status}, "")
}

func (h *socialHandlerImpl) CancelFriendRequest(c *gin.Context) {
	friendshipID, err := parseUintParam(c, "friendship_id")
	if err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage("friendship_id không hợp lệ"))
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.CancelFriendRequest(c.Request.Context(), userID, friendshipID); err != nil {
		response.WriteErrorResponse(c, err)
		return
	}
	response.NoContent(c)
}

func (h *socialHandlerImpl) RemoveFriend(c *gin.Context) {
	targetUserID, err := parseUintParam(c, "user_id")
	if err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage("user_id không hợp lệ"))
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.RemoveFriend(c.Request.Context(), userID, targetUserID); err != nil {
		response.WriteErrorResponse(c, err)
		return
	}
	response.NoContent(c)
}

func (h *socialHandlerImpl) GetFriends(c *gin.Context) {
	userID := middleware.GetUserID(c)
	result, err := h.svc.GetFriends(c.Request.Context(), userID)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	friends := make([]dto.FriendItemResponse, 0, len(result.Friends))
	for _, f := range result.Friends {
		friends = append(friends, dto.FriendItemResponse{
			UserID:         f.UserID,
			DisplayName:    f.DisplayName,
			AvatarURL:      f.AvatarURL,
			CurrentStreak:  f.CurrentStreak,
			LastActivityAt: f.LastActivityAt,
		})
	}

	pending := make([]dto.PendingReceivedItemResponse, 0, len(result.PendingReceived))
	for _, p := range result.PendingReceived {
		pending = append(pending, dto.PendingReceivedItemResponse{
			FriendshipID: p.FriendshipID,
			UserID:       p.UserID,
			DisplayName:  p.DisplayName,
			AvatarURL:    p.AvatarURL,
			RequestedAt:  p.RequestedAt,
		})
	}

	response.OK(c, dto.GetFriendsResponse{Friends: friends, PendingReceived: pending}, "")
}

func (h *socialHandlerImpl) GetFeed(c *gin.Context) {
	userID := middleware.GetUserID(c)
	result, err := h.svc.GetFeed(c.Request.Context(), userID)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	items := make([]dto.FeedItemResponse, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, dto.FeedItemResponse{
			UserID:               item.UserID,
			DisplayName:          item.DisplayName,
			AvatarURL:            item.AvatarURL,
			CurrentStreak:        item.CurrentStreak,
			CompletedAllGoalsToday: item.CompletedAllGoalsToday,
			Calories:             dto.CaloriesProgressResponse{Logged: item.CaloriesLogged, Target: item.CaloriesTarget},
			Macros: dto.MacrosResponse{
				Protein: dto.MacroProgressResponse{LoggedG: item.Protein.LoggedG, TargetG: item.Protein.TargetG},
				Carb:    dto.MacroProgressResponse{LoggedG: item.Carb.LoggedG, TargetG: item.Carb.TargetG},
				Fat:     dto.MacroProgressResponse{LoggedG: item.Fat.LoggedG, TargetG: item.Fat.TargetG},
			},
			Water:          dto.WaterProgressResponse{LoggedMl: item.WaterLoggedMl, TargetMl: item.WaterTargetMl},
			WeightProgress: dto.WeightProgressResponse{LatestKg: item.WeightLatestKg, StartingKg: item.WeightStartingKg, Available: item.WeightAvailable},
			CheerSentToday: item.CheerSentToday,
			CheerCountToday: item.CheerCountToday,
			LastActivityAt:  item.LastActivityAt,
		})
	}

	response.OK(c, dto.GetFeedResponse{
		Date:  result.Date.Format(dateLayout),
		Items: items,
	}, "")
}

func (h *socialHandlerImpl) SendCheer(c *gin.Context) {
	var req dto.SendCheerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage(err.Error()))
		return
	}
	userID := middleware.GetUserID(c)
	result, err := h.svc.SendCheer(c.Request.Context(), userID, req.RecipientID, req.Reaction)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}
	response.Created(c, dto.SendCheerResponse{
		Reaction:        result.Reaction,
		CheerCountToday: result.CheerCountToday,
		CheerLimit:      result.CheerLimit,
	}, "")
}

func (h *socialHandlerImpl) GetChallengeCatalogue(c *gin.Context) {
	userID := middleware.GetUserID(c)
	result, err := h.svc.GetChallengeCatalogue(c.Request.Context(), userID)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	catalogue := make([]dto.CatalogueChallengeItemResponse, 0, len(result.Catalogue))
	for _, ch := range result.Catalogue {
		item := dto.CatalogueChallengeItemResponse{
			ID:              ch.ID,
			Name:            ch.Name,
			Type:            ch.Type,
			DurationDays:    ch.DurationDays,
			Description:     ch.Description,
			FriendsEnrolled: ch.FriendsEnrolled,
		}
		if ch.MyEnrollment != nil {
			e := ch.MyEnrollment
			item.MyEnrollment = &dto.EnrollmentSummaryResponse{
				EnrollmentID: e.EnrollmentID,
				StartDate:    e.StartDate.Format(dateLayout),
				EndDate:      e.EndDate.Format(dateLayout),
				Status:       e.Status,
				DayCurrent:   e.DayCurrent,
				DayTotal:     e.DayTotal,
			}
		}
		catalogue = append(catalogue, item)
	}
	response.OK(c, dto.GetChallengeCatalogueResponse{Catalogue: catalogue}, "")
}

func (h *socialHandlerImpl) JoinChallenge(c *gin.Context) {
	challengeID, err := parseUintParam(c, "challenge_id")
	if err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage("challenge_id không hợp lệ"))
		return
	}
	userID := middleware.GetUserID(c)
	result, err := h.svc.JoinChallenge(c.Request.Context(), userID, challengeID)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}
	response.Created(c, dto.JoinChallengeResponse{
		EnrollmentID: result.EnrollmentID,
		StartDate:    result.StartDate.Format(dateLayout),
		EndDate:      result.EndDate.Format(dateLayout),
		Status:       result.Status,
	}, "")
}

func (h *socialHandlerImpl) GetChallengeProgress(c *gin.Context) {
	challengeID, err := parseUintParam(c, "challenge_id")
	if err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage("challenge_id không hợp lệ"))
		return
	}
	userID := middleware.GetUserID(c)
	result, err := h.svc.GetChallengeProgress(c.Request.Context(), userID, challengeID)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	grid := make([]dto.DayGridItemResponse, 0, len(result.MyProgress.Grid))
	for _, g := range result.MyProgress.Grid {
		grid = append(grid, dto.DayGridItemResponse{Date: g.Date.Format(dateLayout), MetGoal: g.MetGoal})
	}

	friendsProgress := make([]dto.FriendProgressResponse, 0, len(result.FriendsProgress))
	for _, fp := range result.FriendsProgress {
		fpGrid := make([]dto.DayGridItemResponse, 0, len(fp.Grid))
		for _, g := range fp.Grid {
			fpGrid = append(fpGrid, dto.DayGridItemResponse{Date: g.Date.Format(dateLayout), MetGoal: g.MetGoal})
		}
		friendsProgress = append(friendsProgress, dto.FriendProgressResponse{
			UserID:      fp.UserID,
			DisplayName: fp.DisplayName,
			AvatarURL:   fp.AvatarURL,
			Grid:        fpGrid,
		})
	}

	response.OK(c, dto.GetChallengeProgressResponse{
		Challenge: dto.ChallengeInfoResponse{
			ID:   result.ChallengeID,
			Name: result.ChallengeName,
			Type: result.ChallengeType,
		},
		MyProgress: dto.MyProgressResponse{
			EnrollmentID: result.MyProgress.EnrollmentID,
			StartDate:    result.MyProgress.StartDate.Format(dateLayout),
			EndDate:      result.MyProgress.EndDate.Format(dateLayout),
			DayCurrent:   result.MyProgress.DayCurrent,
			DayTotal:     result.MyProgress.DayTotal,
			Grid:         grid,
			BadgeAwarded: result.MyProgress.BadgeAwarded,
		},
		FriendsProgress: friendsProgress,
	}, "")
}

func (h *socialHandlerImpl) AbandonChallenge(c *gin.Context) {
	challengeID, err := parseUintParam(c, "challenge_id")
	if err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage("challenge_id không hợp lệ"))
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.AbandonChallenge(c.Request.Context(), userID, challengeID); err != nil {
		response.WriteErrorResponse(c, err)
		return
	}
	response.NoContent(c)
}

func (h *socialHandlerImpl) GetLeaderboard(c *gin.Context) {
	userID := middleware.GetUserID(c)
	result, err := h.svc.GetLeaderboard(c.Request.Context(), userID)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	rankings := make([]dto.LeaderboardEntryResponse, 0, len(result.Rankings))
	for _, r := range result.Rankings {
		rankings = append(rankings, dto.LeaderboardEntryResponse{
			Rank:           r.Rank,
			UserID:         r.UserID,
			DisplayName:    r.DisplayName,
			AvatarURL:      r.AvatarURL,
			GoalsCompleted: r.GoalsCompleted,
			IsMe:           r.IsMe,
		})
	}

	response.OK(c, dto.GetLeaderboardResponse{
		WeekStart: result.WeekStart.Format(dateLayout),
		WeekEnd:   result.WeekEnd.Format(dateLayout),
		Note:      "Today's data is still in progress and not counted.",
		Rankings:  rankings,
	}, "")
}

func parseUintParam(c *gin.Context, name string) (uint, error) {
	val, err := strconv.ParseUint(c.Param(name), 10, 64)
	if err != nil {
		return 0, err
	}
	return uint(val), nil
}
