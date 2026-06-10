package handler

import (
	"github.com/gin-gonic/gin"

	"nutrimind-backend/internal/interface/api/dto"
	"nutrimind-backend/internal/interface/api/middleware"
	"nutrimind-backend/internal/usecase/service"
	apperror "nutrimind-backend/pkg/error"
	"nutrimind-backend/pkg/response"
)

// AICoachHandler defines HTTP handlers for the AI nutrition coach.
type AICoachHandler interface {
	// POST /api/v1/ai/advice
	GetAdvice(c *gin.Context)
	// POST /api/v1/ai/meal-suggestion
	GetMealSuggestion(c *gin.Context)
}

type aiCoachHandlerImpl struct {
	svc service.AICoachService
}

// NewAICoachHandler creates a new AICoachHandler.
func NewAICoachHandler(svc service.AICoachService) AICoachHandler {
	return &aiCoachHandlerImpl{svc: svc}
}

func (h *aiCoachHandlerImpl) GetAdvice(c *gin.Context) {
	var req dto.GetAdviceRequest
	// body is optional — ignore bind error
	_ = c.ShouldBindJSON(&req)

	userID := middleware.GetUserID(c)
	result, err := h.svc.GetAdvice(c.Request.Context(), service.GetAdviceCommand{
		UserID: userID,
		Prompt: req.Prompt,
	})
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	response.OK(c, dto.AdviceResponse{
		Advice:     result.Advice,
		Disclaimer: result.Disclaimer,
		ContextSummary: dto.AdviceContextSummaryResponse{
			CaloriesLogged: result.ContextSummary.CaloriesLogged,
			CalorieTarget:  result.ContextSummary.CalorieTarget,
			WaterMlLogged:  result.ContextSummary.WaterMlLogged,
			WaterTargetMl:  result.ContextSummary.WaterTargetMl,
		},
	}, "")
}

func (h *aiCoachHandlerImpl) GetMealSuggestion(c *gin.Context) {
	var req dto.GetMealSuggestionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage(err.Error()))
		return
	}

	userID := middleware.GetUserID(c)
	result, err := h.svc.GetMealSuggestion(c.Request.Context(), service.GetMealSuggestionCommand{
		UserID:   userID,
		MealType: req.MealType,
	})
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	response.OK(c, dto.MealSuggestionResponse{
		Suggestion:        result.Suggestion,
		EstimatedCalories: result.EstimatedCalories,
		EstimatedProteinG: result.EstimatedProteinG,
		EstimatedCarbG:    result.EstimatedCarbG,
		EstimatedFatG:     result.EstimatedFatG,
		Disclaimer:        result.Disclaimer,
	}, "")
}
