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

// HealthProfileHandler defines HTTP handlers for profile management.
type HealthProfileHandler interface {
	Onboarding(c *gin.Context)
	GetProfile(c *gin.Context)
	UpdateProfile(c *gin.Context)
	ToggleSocial(c *gin.Context)
}

type healthProfileHandlerImpl struct {
	profileService service.HealthProfileService
}

// NewHealthProfileHandler creates a new health profile handler.
func NewHealthProfileHandler(profileService service.HealthProfileService) HealthProfileHandler {
	return &healthProfileHandlerImpl{profileService: profileService}
}

// Onboarding godoc
// @Summary      Complete onboarding
// @Description  Creates or updates the user's health profile and calculates personalised nutrition targets (BMI, BMR, TDEE, calorie target, macro targets, water target). Can be called multiple times to update profile data.
// @Tags         profile
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body      dto.OnboardingRequest   true  "Onboarding data"
// @Success      201   {object}  dto.OnboardingResponse        "Profile created, targets calculated"
// @Failure      400   {object}  response.ErrorResponse    "Validation error (age/height/weight out of range, invalid gender/goal/activity)"
// @Failure      401   {object}  response.ErrorResponse    "Unauthorized"
// @Failure      500   {object}  response.ErrorResponse    "Internal server error"
// @Router       /profile/onboarding [post]
func (h *healthProfileHandlerImpl) Onboarding(c *gin.Context) {
	var req dto.OnboardingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage(err.Error()))
		return
	}

	userID := middleware.GetUserID(c)

	result, err := h.profileService.Onboarding(c.Request.Context(), service.OnboardingCommand{
		UserID:        userID,
		Age:           req.Age,
		Gender:        req.Gender,
		HeightCm:      req.HeightCm,
		WeightKg:      req.WeightKg,
		Goal:          req.Goal,
		ActivityLevel: req.ActivityLevel,
	})
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	response.Created(c, dto.OnboardingResponse{
		BMI:            result.BMI,
		BMICategory:    result.BMICategory,
		BMR:            result.BMR,
		TDEE:           result.TDEE,
		CalorieTarget:  result.CalorieTarget,
		ProteinTargetG: result.ProteinTargetG,
		CarbTargetG:    result.CarbTargetG,
		FatTargetG:     result.FatTargetG,
		WaterTargetMl:  result.WaterTargetMl,
	}, "Onboarding hoàn thành")
}

// GetProfile godoc
// @Summary      Get my profile
// @Description  Returns the authenticated user's full health profile including calculated nutrition targets and social settings.
// @Tags         profile
// @Security     BearerAuth
// @Produce      json
// @Success      200  {object}  dto.ProfileResponse           "Full profile"
// @Failure      401  {object}  response.ErrorResponse    "Unauthorized"
// @Failure      403  {object}  response.ErrorResponse    "ONBOARDING_REQUIRED — profile not yet created"
// @Failure      500  {object}  response.ErrorResponse    "Internal server error"
// @Router       /profile [get]
func (h *healthProfileHandlerImpl) GetProfile(c *gin.Context) {
	userID := middleware.GetUserID(c)

	data, err := h.profileService.GetProfile(c.Request.Context(), userID)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	response.OK(c, toProfileResponse(data), "")
}

// UpdateProfile godoc
// @Summary      Update profile
// @Description  Partially updates one or more profile fields (age, gender, height, weight, goal, activity_level) and recalculates all nutrition targets. At least one field required.
// @Tags         profile
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body      dto.UpdateProfileRequest  true  "Fields to update (all optional, min 1)"
// @Success      200   {object}  dto.ProfileResponse            "Updated profile with recalculated targets"
// @Failure      400   {object}  response.ErrorResponse     "Validation error or no fields provided"
// @Failure      401   {object}  response.ErrorResponse     "Unauthorized"
// @Failure      403   {object}  response.ErrorResponse     "ONBOARDING_REQUIRED"
// @Failure      500   {object}  response.ErrorResponse     "Internal server error"
// @Router       /profile [patch]
func (h *healthProfileHandlerImpl) UpdateProfile(c *gin.Context) {
	var req dto.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage(err.Error()))
		return
	}

	userID := middleware.GetUserID(c)

	data, err := h.profileService.UpdateProfile(c.Request.Context(), service.UpdateProfileCommand{
		UserID:        userID,
		Age:           req.Age,
		Gender:        req.Gender,
		HeightCm:      req.HeightCm,
		WeightKg:      req.WeightKg,
		Goal:          req.Goal,
		ActivityLevel: req.ActivityLevel,
	})
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	response.OK(c, toProfileResponse(data), "")
}

// ToggleSocial godoc
// @Summary      Toggle social features
// @Description  Enables or disables social features for the current user. When disabled, the user is hidden from friends' feeds and all /social/* endpoints return 403 SOCIAL_DISABLED.
// @Tags         profile
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body      dto.SocialToggleRequest   true  "social_enabled flag"
// @Success      200   {object}  dto.SocialToggleResponse        "Social setting updated"
// @Failure      400   {object}  response.ErrorResponse      "Malformed request body"
// @Failure      401   {object}  response.ErrorResponse      "Unauthorized"
// @Failure      403   {object}  response.ErrorResponse      "ONBOARDING_REQUIRED"
// @Failure      500   {object}  response.ErrorResponse      "Internal server error"
// @Router       /profile/social [patch]
func (h *healthProfileHandlerImpl) ToggleSocial(c *gin.Context) {
	var req dto.SocialToggleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage(err.Error()))
		return
	}

	userID := middleware.GetUserID(c)

	enabled, err := h.profileService.ToggleSocial(c.Request.Context(), userID, req.SocialEnabled)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	response.OK(c, dto.SocialToggleResponse{SocialEnabled: enabled}, "")
}

func toProfileResponse(data *service.ProfileData) dto.ProfileResponse {
	hp := data.Profile
	return dto.ProfileResponse{
		UserID:         hp.UserID,
		DisplayName:    data.DisplayName,
		AvatarURL:      data.AvatarURL,
		Age:            hp.Age,
		Gender:         hp.Gender,
		HeightCm:       hp.HeightCm,
		WeightKg:       hp.WeightKg,
		Goal:           hp.Goal,
		ActivityLevel:  hp.ActivityLevel,
		BMI:            hp.BMI,
		BMICategory:    entity.BMICategory(hp.BMI),
		BMR:            hp.BMR,
		TDEE:           hp.TDEE,
		CalorieTarget:  hp.CalorieTarget,
		ProteinTargetG: hp.ProteinTargetG,
		CarbTargetG:    hp.CarbTargetG,
		FatTargetG:     hp.FatTargetG,
		WaterTargetMl:  hp.WaterTargetMl,
		SocialEnabled:  hp.SocialEnabled,
		OnboardingDone: hp.OnboardingDone,
		CreatedAt:      hp.CreatedAt,
		UpdatedAt:      hp.UpdatedAt,
	}
}
