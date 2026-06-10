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

// NotificationHandler defines HTTP handlers for notifications and reminders.
type NotificationHandler interface {
	// POST /api/v1/notifications/fcm-token
	RegisterFCMToken(c *gin.Context)
	// GET  /api/v1/reminders
	GetReminders(c *gin.Context)
	// PUT  /api/v1/reminders/:type
	UpsertReminder(c *gin.Context)
	// GET  /api/v1/notifications
	ListNotifications(c *gin.Context)
}

type notificationHandlerImpl struct {
	svc service.NotificationService
}

// NewNotificationHandler creates a new NotificationHandler.
func NewNotificationHandler(svc service.NotificationService) NotificationHandler {
	return &notificationHandlerImpl{svc: svc}
}

func (h *notificationHandlerImpl) RegisterFCMToken(c *gin.Context) {
	var req dto.RegisterFCMTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage(err.Error()))
		return
	}

	userID := middleware.GetUserID(c)
	if err := h.svc.RegisterFCMToken(c.Request.Context(), service.RegisterFCMTokenCommand{
		UserID:   userID,
		FCMToken: req.FCMToken,
		Platform: req.Platform,
	}); err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	response.OK(c, gin.H{}, "")
}

func (h *notificationHandlerImpl) GetReminders(c *gin.Context) {
	userID := middleware.GetUserID(c)
	results, err := h.svc.GetReminders(c.Request.Context(), userID)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	items := make([]dto.ReminderConfigResponse, 0, len(results))
	for _, r := range results {
		times := r.SpecificTimes
		if times == nil {
			times = []string{}
		}
		items = append(items, dto.ReminderConfigResponse{
			ID:            r.ID,
			ReminderType:  r.ReminderType,
			Enabled:       r.Enabled,
			FrequencyMin:  r.FrequencyMin,
			SpecificTimes: times,
			WindowStart:   r.WindowStart,
			WindowEnd:     r.WindowEnd,
			CustomMessage: r.CustomMessage,
		})
	}

	response.OK(c, dto.GetRemindersResponse{Reminders: items}, "")
}

func (h *notificationHandlerImpl) UpsertReminder(c *gin.Context) {
	reminderType := c.Param("type")

	var req dto.UpsertReminderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage(err.Error()))
		return
	}

	userID := middleware.GetUserID(c)
	result, err := h.svc.UpsertReminder(c.Request.Context(), service.UpsertReminderCommand{
		UserID:        userID,
		ReminderType:  reminderType,
		Enabled:       req.Enabled,
		FrequencyMin:  req.FrequencyMin,
		SpecificTimes: req.SpecificTimes,
		WindowStart:   req.WindowStart,
		WindowEnd:     req.WindowEnd,
		CustomMessage: req.CustomMessage,
	})
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	times := result.SpecificTimes
	if times == nil {
		times = []string{}
	}
	response.OK(c, dto.ReminderConfigResponse{
		ID:            result.ID,
		ReminderType:  result.ReminderType,
		Enabled:       result.Enabled,
		FrequencyMin:  result.FrequencyMin,
		SpecificTimes: times,
		WindowStart:   result.WindowStart,
		WindowEnd:     result.WindowEnd,
		CustomMessage: result.CustomMessage,
	}, "")
}

func (h *notificationHandlerImpl) ListNotifications(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "10")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 10
	}
	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	userID := middleware.GetUserID(c)
	result, err := h.svc.ListNotifications(c.Request.Context(), userID, offset, limit)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	items := make([]dto.NotificationLogResponse, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, dto.NotificationLogResponse{
			ID:               item.ID,
			NotificationType: item.NotificationType,
			Title:            item.Title,
			Body:             item.Body,
			DeepLink:         item.DeepLink,
			Status:           item.Status,
			ScheduledAt:      item.ScheduledAt,
			SentAt:           item.SentAt,
		})
	}

	response.OK(c, dto.ListNotificationsResponse{
		Items:  items,
		Total:  result.Total,
		Limit:  result.Limit,
		Offset: result.Offset,
	}, "")
}
