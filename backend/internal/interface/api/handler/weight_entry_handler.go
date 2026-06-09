package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/interface/api/dto"
	"nutrimind-backend/internal/interface/api/middleware"
	"nutrimind-backend/internal/usecase/service"
	apperror "nutrimind-backend/pkg/error"
	"nutrimind-backend/pkg/response"
)

// WeightEntryHandler defines HTTP handlers for weight tracking.
type WeightEntryHandler interface {
	// POST /api/weight-entries  — log or update weight for a given date
	LogWeight(c *gin.Context)
	// GET  /api/weight-entries  — paginated history (newest first)
	GetHistory(c *gin.Context)
	// GET  /api/weight-entries/date?date=YYYY-MM-DD  — lookup by date
	GetByDate(c *gin.Context)
	// DELETE /api/weight-entries/:id
	Delete(c *gin.Context)
}

type weightEntryHandlerImpl struct {
	weightService service.WeightEntryService
}

// NewWeightEntryHandler creates a new WeightEntryHandler.
func NewWeightEntryHandler(weightService service.WeightEntryService) WeightEntryHandler {
	return &weightEntryHandlerImpl{weightService: weightService}
}

// LogWeight godoc
// @Summary     Log weight entry
// @Description Record (or overwrite) a weight measurement for a specific date.
//
//	If no date is supplied, today's date is used. Weight must be 15–300 kg.
//
// @Tags        weight-entries
// @Security    BearerAuth
// @Accept      json
// @Produce     json
// @Param       body body dto.LogWeightRequest true "Weight data"
// @Success     200 {object} dto.WeightEntryResponse "Updated entry"
// @Success     201 {object} dto.WeightEntryResponse "Created entry"
// @Router      /api/weight-entries [post]
func (h *weightEntryHandlerImpl) LogWeight(c *gin.Context) {
	var req dto.LogWeightRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.WriteErrorResponse(c, apperror.ErrBadRequest.WithMessage(err.Error()))
		return
	}

	// Determine date: use request date or fall back to today (UTC)
	date := time.Now().UTC().Truncate(24 * time.Hour)
	if req.Date != "" {
		parsed, err := time.Parse("2006-01-02", req.Date)
		if err != nil {
			response.WriteErrorResponse(c, apperror.ErrBadRequest.WithMessage("định dạng ngày không hợp lệ, vui lòng dùng YYYY-MM-DD"))
			return
		}
		date = parsed.UTC().Truncate(24 * time.Hour)
	}

	userID := middleware.GetUserID(c)
	cmd := service.LogWeightCommand{
		UserID:   userID,
		Date:     date,
		WeightKg: req.WeightKg,
		Note:     req.Note,
	}

	entry, err := h.weightService.LogWeight(c.Request.Context(), cmd)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	resp := toWeightEntryResponse(entry)
	// Return 200 if updated (ID was already in DB), 201 if newly created.
	// Since we can't easily tell from the service layer, we always return 200 here.
	c.JSON(http.StatusOK, response.APIResponse[dto.WeightEntryResponse]{
		IsSuccess: true,
		Data:      resp,
		Message:   "Đã lưu cân nặng thành công",
	})
}

// GetHistory godoc
// @Summary     Get weight history
// @Description Returns the authenticated user's weight history, newest first.
// @Tags        weight-entries
// @Security    BearerAuth
// @Produce     json
// @Param       page      query int false "Page number (default 1)"
// @Param       page_size query int false "Items per page (default 20, max 100)"
// @Success     200 {object} dto.WeightHistoryResponse
// @Router      /api/weight-entries [get]
func (h *weightEntryHandlerImpl) GetHistory(c *gin.Context) {
	userID := middleware.GetUserID(c)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	entries, total, err := h.weightService.GetWeightHistory(c.Request.Context(), userID, page, pageSize)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	responseEntries := make([]dto.WeightEntryResponse, 0, len(entries))
	for _, e := range entries {
		responseEntries = append(responseEntries, toWeightEntryResponse(&e))
	}

	response.OK(c, dto.WeightHistoryResponse{
		Entries:  responseEntries,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, "")
}

// GetByDate godoc
// @Summary     Get weight entry by date
// @Description Returns the weight entry for the given date (YYYY-MM-DD).
// @Tags        weight-entries
// @Security    BearerAuth
// @Produce     json
// @Param       date query string true "Date in YYYY-MM-DD format"
// @Success     200 {object} dto.WeightEntryResponse
// @Router      /api/weight-entries/date [get]
func (h *weightEntryHandlerImpl) GetByDate(c *gin.Context) {
	dateStr := c.Query("date")
	if dateStr == "" {
		response.WriteErrorResponse(c, apperror.ErrBadRequest.WithMessage("tham số date là bắt buộc (YYYY-MM-DD)"))
		return
	}

	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		response.WriteErrorResponse(c, apperror.ErrBadRequest.WithMessage("định dạng ngày không hợp lệ, vui lòng dùng YYYY-MM-DD"))
		return
	}

	userID := middleware.GetUserID(c)
	entry, err := h.weightService.GetWeightByDate(c.Request.Context(), userID, date)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	response.OK(c, toWeightEntryResponse(entry), "")
}

// Delete godoc
// @Summary     Delete weight entry
// @Description Removes a weight entry by ID. Only the owner may delete their entries.
// @Tags        weight-entries
// @Security    BearerAuth
// @Produce     json
// @Param       id path int true "Weight entry ID"
// @Success     204
// @Router      /api/weight-entries/{id} [delete]
func (h *weightEntryHandlerImpl) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.WriteErrorResponse(c, apperror.ErrBadRequest.WithMessage("id không hợp lệ"))
		return
	}

	userID := middleware.GetUserID(c)
	if err := h.weightService.DeleteWeightEntry(c.Request.Context(), userID, uint(id)); err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	response.NoContent(c)
}

// toWeightEntryResponse converts a domain entity to a DTO.
func toWeightEntryResponse(e *entity.WeightEntry) dto.WeightEntryResponse {
	return dto.WeightEntryResponse{
		ID:        e.ID,
		UserID:    e.UserID,
		Date:      e.Date.Format("2006-01-02"),
		WeightKg:  e.WeightKg,
		Note:      e.Note,
		CreatedAt: e.CreatedAt,
		UpdatedAt: e.UpdatedAt,
	}
}
