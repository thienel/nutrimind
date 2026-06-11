package handler

import (
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"nutrimind-backend/internal/interface/api/dto"
	"nutrimind-backend/internal/interface/api/middleware"
	"nutrimind-backend/internal/usecase/service"
	apperror "nutrimind-backend/pkg/error"
	"nutrimind-backend/pkg/response"
)

const maxImageSizeBytes = 10 << 20 // 10 MB

// MealHandler defines HTTP handlers for meal logging and nutrition tracking.
type MealHandler interface {
	// POST /api/v1/meals
	LogMeal(c *gin.Context)
	// POST /api/v1/meals/ai-analyze
	AIAnalyze(c *gin.Context)
	// GET  /api/v1/meals?date=YYYY-MM-DD
	GetMealsByDate(c *gin.Context)
	// DELETE /api/v1/meals/:id
	DeleteMeal(c *gin.Context)
}

type mealHandlerImpl struct {
	svc service.MealService
}

// NewMealHandler creates a new MealHandler.
func NewMealHandler(svc service.MealService) MealHandler {
	return &mealHandlerImpl{svc: svc}
}

// LogMeal godoc
// @Summary      Log a meal
// @Description  Records a meal entry for the authenticated user. Source must be "manual" or "AI_PHOTO". One meal entry per food item per meal type per day — duplicate entries return 409 CONFLICT.
// @Tags         meals
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body      dto.LogMealRequest   true  "Meal entry data"
// @Success      201   {object}  dto.MealEntryResponse       "Meal logged successfully"
// @Failure      400   {object}  response.ErrorResponse  "Validation error"
// @Failure      401   {object}  response.ErrorResponse  "Unauthorized"
// @Failure      403   {object}  response.ErrorResponse  "ONBOARDING_REQUIRED"
// @Failure      409   {object}  response.ErrorResponse  "CONFLICT — duplicate entry"
// @Failure      500   {object}  response.ErrorResponse  "Internal server error"
// @Router       /meals [post]
func (h *mealHandlerImpl) LogMeal(c *gin.Context) {
	var req dto.LogMealRequest
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
	cmd := service.LogMealCommand{
		UserID:          userID,
		FoodName:        req.FoodName,
		MealType:        req.MealType,
		Calories:        req.Calories,
		ProteinG:        req.ProteinG,
		CarbG:           req.CarbG,
		FatG:            req.FatG,
		Source:          req.Source,
		AIConfidence:    req.AIConfidence,
		LoggedDate:      loggedDate,
		ClientCreatedAt: req.ClientCreatedAt,
	}

	result, err := h.svc.LogMeal(c.Request.Context(), cmd)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	response.Created(c, toMealEntryResponse(result), "Đã lưu bữa ăn thành công")
}

// AIAnalyze godoc
// @Summary      AI photo analysis
// @Description  Analyses a food photo using OpenAI Vision and returns estimated nutritional data. Max image size 10 MB (JPEG or PNG only). The result is an estimate — client should display the disclaimer field.
// @Tags         meals
// @Security     BearerAuth
// @Accept       multipart/form-data
// @Produce      json
// @Param        image        formData  file    true   "Food photo (JPEG or PNG, max 10 MB)"
// @Param        description  formData  string  false  "Optional text hint to help the model (e.g. 'bowl of pho')"
// @Success      200  {object}  dto.AIAnalysisResponse      "Analysis result"
// @Failure      400  {object}  response.ErrorResponse  "Missing image, wrong format, or file too large"
// @Failure      401  {object}  response.ErrorResponse  "Unauthorized"
// @Failure      500  {object}  response.ErrorResponse  "Internal server error or AI service error"
// @Router       /meals/ai-analyze [post]
func (h *mealHandlerImpl) AIAnalyze(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxImageSizeBytes+1024)

	file, fileHeader, err := c.Request.FormFile("image")
	if err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage("Vui lòng đính kèm file ảnh với key 'image'"))
		return
	}
	defer file.Close()

	if fileHeader.Size > maxImageSizeBytes {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage("Kích thước ảnh không được vượt quá 10MB"))
		return
	}

	contentType := detectImageMIME(fileHeader.Header.Get("Content-Type"), fileHeader.Filename)
	if contentType == "" {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage("Chỉ hỗ trợ file JPEG hoặc PNG"))
		return
	}

	imageData, err := io.ReadAll(file)
	if err != nil {
		response.WriteErrorResponse(c, apperror.ErrInternalServerError)
		return
	}

	description := c.PostForm("description")
	result, err := h.svc.AnalyzePhoto(c.Request.Context(), imageData, contentType, description)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	response.OK(c, dto.AIAnalysisResponse{
		FoodName:      result.FoodName,
		Calories:      result.Calories,
		ProteinG:      result.ProteinG,
		CarbG:         result.CarbG,
		FatG:          result.FatG,
		Confidence:    result.Confidence,
		LowConfidence: result.LowConfidence,
		Disclaimer:    result.Disclaimer,
	}, "")
}

// GetMealsByDate godoc
// @Summary      Get meals by date
// @Description  Returns all meal entries for a given date, grouped by meal type (breakfast, lunch, dinner, snack), with daily nutrition totals.
// @Tags         meals
// @Security     BearerAuth
// @Produce      json
// @Param        date  query     string  true  "Date in YYYY-MM-DD format"
// @Success      200   {object}  dto.DailyMealsResponse      "Meals grouped by type with daily totals"
// @Failure      400   {object}  response.ErrorResponse  "Missing or invalid date"
// @Failure      401   {object}  response.ErrorResponse  "Unauthorized"
// @Failure      500   {object}  response.ErrorResponse  "Internal server error"
// @Router       /meals [get]
func (h *mealHandlerImpl) GetMealsByDate(c *gin.Context) {
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
	result, err := h.svc.GetMealsByDate(c.Request.Context(), userID, date)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	response.OK(c, dto.DailyMealsResponse{
		Date: result.Date.Format("2006-01-02"),
		Meals: dto.MealsByTypeResponse{
			Breakfast: toMealEntryResponseSlice(result.Breakfast),
			Lunch:     toMealEntryResponseSlice(result.Lunch),
			Dinner:    toMealEntryResponseSlice(result.Dinner),
			Snack:     toMealEntryResponseSlice(result.Snack),
		},
		DailyTotals: dto.MealDailyTotalsResponse{
			Calories: result.DailyTotals.Calories,
			ProteinG: result.DailyTotals.ProteinG,
			CarbG:    result.DailyTotals.CarbG,
			FatG:     result.DailyTotals.FatG,
		},
	}, "")
}

// DeleteMeal godoc
// @Summary      Delete meal entry
// @Description  Permanently deletes a meal entry by ID. Only the owner can delete their own entries.
// @Tags         meals
// @Security     BearerAuth
// @Produce      json
// @Param        id   path  int  true  "Meal entry ID"
// @Success      204  "Meal deleted"
// @Failure      400  {object}  response.ErrorResponse  "Invalid ID"
// @Failure      401  {object}  response.ErrorResponse  "Unauthorized"
// @Failure      404  {object}  response.ErrorResponse  "Meal not found or not owned by user"
// @Failure      500  {object}  response.ErrorResponse  "Internal server error"
// @Router       /meals/{id} [delete]
func (h *mealHandlerImpl) DeleteMeal(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage("ID bữa ăn không hợp lệ"))
		return
	}

	userID := middleware.GetUserID(c)
	if err := h.svc.DeleteMeal(c.Request.Context(), userID, uint(id)); err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	response.NoContent(c)
}

// --- Converters ---

func toMealEntryResponse(r *service.MealEntryResult) dto.MealEntryResponse {
	return dto.MealEntryResponse{
		ID:         r.ID,
		FoodName:   r.FoodName,
		MealType:   r.MealType,
		Calories:   r.Calories,
		ProteinG:   r.ProteinG,
		CarbG:      r.CarbG,
		FatG:       r.FatG,
		Source:     r.Source,
		LoggedDate: r.LoggedDate.Format("2006-01-02"),
		CreatedAt:  r.CreatedAt,
	}
}

func toMealEntryResponseSlice(items []service.MealEntryResult) []dto.MealEntryResponse {
	out := make([]dto.MealEntryResponse, 0, len(items))
	for i := range items {
		out = append(out, toMealEntryResponse(&items[i]))
	}
	return out
}

// detectImageMIME returns the MIME type if it is JPEG or PNG, otherwise "".
func detectImageMIME(contentType, filename string) string {
	switch contentType {
	case "image/jpeg", "image/png":
		return contentType
	}
	name := strings.ToLower(filename)
	if strings.HasSuffix(name, ".jpg") || strings.HasSuffix(name, ".jpeg") {
		return "image/jpeg"
	}
	if strings.HasSuffix(name, ".png") {
		return "image/png"
	}
	return ""
}
