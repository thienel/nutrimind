package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"nutrimind-backend/internal/interface/api/dto"
	"nutrimind-backend/internal/interface/api/middleware"
	"nutrimind-backend/internal/usecase/service"
	apperror "nutrimind-backend/pkg/error"
	"nutrimind-backend/pkg/response"
)

// HealthMetricHandler defines HTTP handlers for health metric tracking.
type HealthMetricHandler interface {
	// POST /api/v1/health/weight — log or update weight for a given date
	LogWeight(c *gin.Context)
	// GET  /api/v1/health/weight — paginated weight history
	GetWeightHistory(c *gin.Context)
	// GET  /api/v1/health/summary — BMI/targets + latest weight + 90-day chart data
	GetHealthSummary(c *gin.Context)
}

type healthMetricHandlerImpl struct {
	svc service.HealthMetricService
}

// NewHealthMetricHandler creates a new HealthMetricHandler.
func NewHealthMetricHandler(svc service.HealthMetricService) HealthMetricHandler {
	return &healthMetricHandlerImpl{svc: svc}
}

func (h *healthMetricHandlerImpl) LogWeight(c *gin.Context) {
	var req dto.LogWeightRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage(err.Error()))
		return
	}

	loggedAt, err := time.Parse("2006-01-02", req.LoggedAt)
	if err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage("logged_at không hợp lệ, dùng định dạng YYYY-MM-DD"))
		return
	}

	userID := middleware.GetUserID(c)
	cmd := service.LogWeightMetricCommand{
		UserID:          userID,
		LoggedAt:        loggedAt,
		WeightKg:        req.WeightKg,
		Note:            req.Note,
		ClientCreatedAt: req.ClientCreatedAt,
	}

	result, err := h.svc.LogWeight(c.Request.Context(), cmd)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	c.JSON(http.StatusCreated, response.APIResponse[dto.WeightLogResponse]{
		IsSuccess: true,
		Data:      toWeightLogResponse(result),
		Message:   "Đã lưu cân nặng thành công",
	})
}

func (h *healthMetricHandlerImpl) GetWeightHistory(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	userID := middleware.GetUserID(c)
	results, total, err := h.svc.GetWeightHistory(c.Request.Context(), userID, limit, offset)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	items := make([]dto.WeightLogResponse, 0, len(results))
	for _, r := range results {
		items = append(items, toWeightLogResponse(&r))
	}

	response.OK(c, dto.WeightHistoryResponse{
		Items:  items,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}, "")
}

func (h *healthMetricHandlerImpl) GetHealthSummary(c *gin.Context) {
	userID := middleware.GetUserID(c)
	result, err := h.svc.GetHealthSummary(c.Request.Context(), userID)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	resp := toHealthSummaryResponse(result)
	response.OK(c, resp, "")
}

// --- Converters ---

func toWeightLogResponse(r *service.WeightLogResult) dto.WeightLogResponse {
	return dto.WeightLogResponse{
		ID:          r.ID,
		WeightKg:    r.WeightKg,
		LoggedAt:    r.LoggedAt.Format("2006-01-02"),
		Note:        r.Note,
		BMI:         r.BMI,
		BMICategory: r.BMICategory,
		CreatedAt:   r.CreatedAt,
	}
}

func toHealthSummaryResponse(r *service.HealthSummaryResult) dto.HealthSummaryResponse {
	resp := dto.HealthSummaryResponse{
		BMI:            r.BMI,
		BMICategory:    r.BMICategory,
		BMR:            r.BMR,
		TDEE:           r.TDEE,
		CalorieTarget:  r.CalorieTarget,
		ProteinTargetG: r.ProteinTargetG,
		CarbTargetG:    r.CarbTargetG,
		FatTargetG:     r.FatTargetG,
		WaterTargetMl:  r.WaterTargetMl,
	}

	if r.LatestWeight != nil {
		resp.LatestWeight = &dto.LatestWeightSummary{
			WeightKg: r.LatestWeight.WeightKg,
			LoggedAt: r.LatestWeight.LoggedAt.Format("2006-01-02"),
		}
	}

	resp.WeightHistory = make([]dto.WeightPointDTO, 0, len(r.WeightHistory))
	for _, p := range r.WeightHistory {
		resp.WeightHistory = append(resp.WeightHistory, dto.WeightPointDTO{
			LoggedAt: p.LoggedAt.Format("2006-01-02"),
			WeightKg: p.WeightKg,
		})
	}

	return resp
}
