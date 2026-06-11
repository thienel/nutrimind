package handler

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"nutrimind-backend/internal/interface/api/dto"
	"nutrimind-backend/internal/interface/api/middleware"
	"nutrimind-backend/internal/usecase/service"
	apperror "nutrimind-backend/pkg/error"
	"nutrimind-backend/pkg/response"
)

// WaterHandler defines HTTP handlers for water intake tracking.
type WaterHandler interface {
	// POST /api/v1/water
	LogWater(c *gin.Context)
	// GET  /api/v1/water?date=YYYY-MM-DD
	GetWaterByDate(c *gin.Context)
	// GET  /api/v1/water/history?from=YYYY-MM-DD&to=YYYY-MM-DD
	GetWaterHistory(c *gin.Context)
	// DELETE /api/v1/water/:id
	DeleteWater(c *gin.Context)
}

type waterHandlerImpl struct {
	svc service.WaterService
}

// NewWaterHandler creates a new WaterHandler.
func NewWaterHandler(svc service.WaterService) WaterHandler {
	return &waterHandlerImpl{svc: svc}
}

// LogWater godoc
// @Summary      Log water intake
// @Description  Records a water intake entry for the given date. Multiple entries per day are allowed (e.g. each glass separately).
// @Tags         water
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body      dto.LogWaterRequest  true  "Water intake data"
// @Success      201   {object}  dto.WaterLogResponse       "Entry logged with updated daily total and target"
// @Failure      400   {object}  response.ErrorResponse  "Validation error"
// @Failure      401   {object}  response.ErrorResponse  "Unauthorized"
// @Failure      403   {object}  response.ErrorResponse  "ONBOARDING_REQUIRED"
// @Failure      500   {object}  response.ErrorResponse  "Internal server error"
// @Router       /water [post]
func (h *waterHandlerImpl) LogWater(c *gin.Context) {
	var req dto.LogWaterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage(err.Error()))
		return
	}

	loggedDate, err := time.Parse("2006-01-02", req.LoggedDate)
	if err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage("logged_date không hợp lệ, dùng định dạng YYYY-MM-DD"))
		return
	}

	userID := middleware.GetUserID(c)
	result, err := h.svc.LogWater(c.Request.Context(), service.LogWaterCommand{
		UserID:          userID,
		VolumeMl:        req.VolumeMl,
		LoggedDate:      loggedDate,
		ClientCreatedAt: req.ClientCreatedAt,
	})
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	response.Created(c, dto.WaterLogResponse{
		ID:            result.ID,
		VolumeMl:      result.VolumeMl,
		LoggedDate:    result.LoggedDate.Format("2006-01-02"),
		DailyTotalMl:  result.DailyTotalMl,
		WaterTargetMl: result.WaterTargetMl,
		CreatedAt:     result.CreatedAt,
	}, "Đã lưu lượng nước thành công")
}

// GetWaterByDate godoc
// @Summary      Get water intake by date
// @Description  Returns all individual water intake entries for a given date, with the day's running total and the user's daily water target.
// @Tags         water
// @Security     BearerAuth
// @Produce      json
// @Param        date  query     string  true  "Date in YYYY-MM-DD format"
// @Success      200   {object}  dto.WaterDayResponse        "Water entries for the day"
// @Failure      400   {object}  response.ErrorResponse  "Missing or invalid date"
// @Failure      401   {object}  response.ErrorResponse  "Unauthorized"
// @Failure      500   {object}  response.ErrorResponse  "Internal server error"
// @Router       /water [get]
func (h *waterHandlerImpl) GetWaterByDate(c *gin.Context) {
	dateStr := c.Query("date")
	if dateStr == "" {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage("Vui lòng cung cấp tham số 'date' theo định dạng YYYY-MM-DD"))
		return
	}

	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage("date không hợp lệ, dùng định dạng YYYY-MM-DD"))
		return
	}

	userID := middleware.GetUserID(c)
	result, err := h.svc.GetWaterByDate(c.Request.Context(), userID, date)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	entries := make([]dto.WaterEntryResponse, 0, len(result.Entries))
	for _, e := range result.Entries {
		entries = append(entries, dto.WaterEntryResponse{
			ID:        e.ID,
			VolumeMl:  e.VolumeMl,
			CreatedAt: e.CreatedAt,
		})
	}

	response.OK(c, dto.WaterDayResponse{
		Date:          result.Date.Format("2006-01-02"),
		Entries:       entries,
		DailyTotalMl:  result.DailyTotalMl,
		WaterTargetMl: result.WaterTargetMl,
	}, "")
}

// GetWaterHistory godoc
// @Summary      Get water history range
// @Description  Returns daily aggregated water totals for a date range (from–to inclusive). "to" must be >= "from".
// @Tags         water
// @Security     BearerAuth
// @Produce      json
// @Param        from  query     string  true  "Start date YYYY-MM-DD"
// @Param        to    query     string  true  "End date YYYY-MM-DD (must be >= from)"
// @Success      200   {object}  dto.WaterHistoryResponse    "Daily totals for the range with water target"
// @Failure      400   {object}  response.ErrorResponse  "Missing, invalid, or inverted date range"
// @Failure      401   {object}  response.ErrorResponse  "Unauthorized"
// @Failure      500   {object}  response.ErrorResponse  "Internal server error"
// @Router       /water/history [get]
func (h *waterHandlerImpl) GetWaterHistory(c *gin.Context) {
	fromStr := c.Query("from")
	toStr := c.Query("to")
	if fromStr == "" || toStr == "" {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage("Vui lòng cung cấp tham số 'from' và 'to' theo định dạng YYYY-MM-DD"))
		return
	}

	from, err := time.Parse("2006-01-02", fromStr)
	if err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage("from không hợp lệ, dùng định dạng YYYY-MM-DD"))
		return
	}

	to, err := time.Parse("2006-01-02", toStr)
	if err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage("to không hợp lệ, dùng định dạng YYYY-MM-DD"))
		return
	}

	if to.Before(from) {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage("'to' phải lớn hơn hoặc bằng 'from'"))
		return
	}

	userID := middleware.GetUserID(c)
	result, err := h.svc.GetWaterHistory(c.Request.Context(), userID, from, to)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	items := make([]dto.WaterHistoryItemResponse, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, dto.WaterHistoryItemResponse{
			Date:    item.Date.Format("2006-01-02"),
			TotalMl: item.TotalMl,
		})
	}

	response.OK(c, dto.WaterHistoryResponse{
		Items:         items,
		WaterTargetMl: result.WaterTargetMl,
	}, "")
}

// DeleteWater godoc
// @Summary      Delete water entry
// @Description  Permanently deletes a single water intake entry by ID. Only the owner can delete their own entries.
// @Tags         water
// @Security     BearerAuth
// @Produce      json
// @Param        id   path  int  true  "Water entry ID"
// @Success      204  "Entry deleted"
// @Failure      400  {object}  response.ErrorResponse  "Invalid ID"
// @Failure      401  {object}  response.ErrorResponse  "Unauthorized"
// @Failure      404  {object}  response.ErrorResponse  "Entry not found or not owned by user"
// @Failure      500  {object}  response.ErrorResponse  "Internal server error"
// @Router       /water/{id} [delete]
func (h *waterHandlerImpl) DeleteWater(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage("ID không hợp lệ"))
		return
	}

	userID := middleware.GetUserID(c)
	if err := h.svc.DeleteWater(c.Request.Context(), userID, uint(id)); err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	response.NoContent(c)
}
