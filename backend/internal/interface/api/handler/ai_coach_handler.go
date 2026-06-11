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

// GetAdvice godoc
// @Summary      Get AI nutrition advice
// @Description  Returns personalised nutrition advice from the AI coach based on today's logged calories and water intake vs. the user's targets. An optional custom prompt can steer the advice. The response always includes a disclaimer field.
// @Tags         ai
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body      dto.GetAdviceRequest  false  "Optional prompt (body may be omitted entirely)"
// @Success      200   {object}  dto.AdviceResponse          "AI advice with context summary"
// @Failure      401   {object}  response.ErrorResponse  "Unauthorized"
// @Failure      403   {object}  response.ErrorResponse  "ONBOARDING_REQUIRED"
// @Failure      500   {object}  response.ErrorResponse  "Internal server error or AI service error"
// @Router       /ai/advice [post]
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

// GetMealSuggestion godoc
// @Summary      Get AI meal suggestion
// @Description  Returns a meal suggestion for a given meal type (breakfast, lunch, dinner, snack) tailored to the user's calorie and macro targets. Estimated nutritional values are included.
// @Tags         ai
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body      dto.GetMealSuggestionRequest  true  "Meal type to suggest for"
// @Success      200   {object}  dto.MealSuggestionResponse         "Suggested meal with estimated macros and disclaimer"
// @Failure      400   {object}  response.ErrorResponse         "Validation error (invalid meal_type)"
// @Failure      401   {object}  response.ErrorResponse         "Unauthorized"
// @Failure      403   {object}  response.ErrorResponse         "ONBOARDING_REQUIRED"
// @Failure      500   {object}  response.ErrorResponse         "Internal server error or AI service error"
// @Router       /ai/meal-suggestion [post]
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
