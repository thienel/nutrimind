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
