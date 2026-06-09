package handler

import (
	"github.com/gin-gonic/gin"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/interface/api/dto"
	"nutrimind-backend/internal/interface/api/middleware"
	"nutrimind-backend/internal/usecase/service"
	apperror "nutrimind-backend/pkg/error"
	"nutrimind-backend/pkg/response"
)

// HealthProfileHandler defines HTTP handlers for health profile operations.
type HealthProfileHandler interface {
	CreateProfile(c *gin.Context)
	GetMyProfile(c *gin.Context)
}

type healthProfileHandlerImpl struct {
	healthProfileService service.HealthProfileService
}

// NewHealthProfileHandler creates a new health profile handler.
func NewHealthProfileHandler(healthProfileService service.HealthProfileService) HealthProfileHandler {
	return &healthProfileHandlerImpl{healthProfileService: healthProfileService}
}

// CreateProfile godoc
// @Summary     Create health profile
// @Description Creates the user's health profile for the first time (name, age, gender, height, weight, goal, activity level).
// @Tags        health-profile
// @Security    BearerAuth
// @Accept      json
// @Produce     json
// @Param       body body dto.CreateHealthProfileRequest true "Health profile data"
// @Success     201 {object} dto.HealthProfileResponse
// @Router      /api/health-profile [post]
func (h *healthProfileHandlerImpl) CreateProfile(c *gin.Context) {
	var req dto.CreateHealthProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.WriteErrorResponse(c, apperror.ErrBadRequest.WithMessage(err.Error()))
		return
	}

	userID := middleware.GetUserID(c)

	cmd := service.CreateHealthProfileCommand{
		UserID:        userID,
		FullName:      req.FullName,
		Age:           req.Age,
		Gender:        req.Gender,
		HeightCm:      req.HeightCm,
		WeightKg:      req.WeightKg,
		Goal:          req.Goal,
		ActivityLevel: req.ActivityLevel,
	}

	profile, err := h.healthProfileService.CreateProfile(c.Request.Context(), cmd)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	response.Created(c, toHealthProfileResponse(profile), "Health profile đã được tạo thành công")
}

// GetMyProfile godoc
// @Summary     Get my health profile
// @Description Returns the authenticated user's health profile.
// @Tags        health-profile
// @Security    BearerAuth
// @Produce     json
// @Success     200 {object} dto.HealthProfileResponse
// @Router      /api/health-profile/me [get]
func (h *healthProfileHandlerImpl) GetMyProfile(c *gin.Context) {
	userID := middleware.GetUserID(c)

	profile, err := h.healthProfileService.GetProfileByUserID(c.Request.Context(), userID)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	response.OK(c, toHealthProfileResponse(profile), "")
}

func toHealthProfileResponse(hp *entity.HealthProfile) dto.HealthProfileResponse {
	return dto.HealthProfileResponse{
		ID:            hp.ID,
		UserID:        hp.UserID,
		FullName:      hp.FullName,
		Age:           hp.Age,
		Gender:        hp.Gender,
		HeightCm:      hp.HeightCm,
		WeightKg:      hp.WeightKg,
		Goal:          hp.Goal,
		ActivityLevel: hp.ActivityLevel,
		CreatedAt:     hp.CreatedAt,
		UpdatedAt:     hp.UpdatedAt,
	}
}
