package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/interface/api/dto"
	"nutrimind-backend/internal/usecase/service"
	apperror "nutrimind-backend/pkg/error"
	"nutrimind-backend/pkg/query"
	"nutrimind-backend/pkg/response"
)

var userAllowedFields = map[string]bool{
	"id":           true,
	"email":        true,
	"display_name": true,
	"role":         true,
	"status":       true,
	"created_at":   true,
	"search":       true,
}

// UserHandler interface
type UserHandler interface {
	List(c *gin.Context)
	GetByID(c *gin.Context)
	Update(c *gin.Context)
	Delete(c *gin.Context)
}

type userHandlerImpl struct {
	userService service.UserService
}

// NewUserHandler creates a new user handler
func NewUserHandler(userService service.UserService) UserHandler {
	return &userHandlerImpl{userService: userService}
}

func (h *userHandlerImpl) List(c *gin.Context) {
	params := make(map[string]string)
	for key, values := range c.Request.URL.Query() {
		if len(values) > 0 {
			params[key] = values[0]
		}
	}

	offset, limit := query.GetPagination(params, 20)
	opts := query.ParseQueryParams(params, userAllowedFields)

	users, total, err := h.userService.List(c.Request.Context(), offset, limit, opts)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	items := make([]dto.UserResponse, len(users))
	for i, u := range users {
		items[i] = userEntityToResponse(u)
	}

	page := (offset / limit) + 1
	totalPages := int((total + int64(limit) - 1) / int64(limit))

	response.OK(c, dto.ListResponse[dto.UserResponse]{
		Items:      items,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, "")
}

func (h *userHandlerImpl) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.WriteErrorResponse(c, apperror.ErrBadRequest.WithMessage("ID không hợp lệ"))
		return
	}

	user, err := h.userService.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	response.OK(c, userEntityToResponse(user), "")
}

func (h *userHandlerImpl) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.WriteErrorResponse(c, apperror.ErrBadRequest.WithMessage("ID không hợp lệ"))
		return
	}

	var req dto.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.WriteErrorResponse(c, apperror.ErrValidation.WithMessage("Dữ liệu không hợp lệ"))
		return
	}

	user, err := h.userService.Update(c.Request.Context(), service.UpdateUserCommand{
		ID:     uint(id),
		Role:   req.Role,
		Status: req.Status,
	})
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	response.OK(c, userEntityToResponse(user), "Cập nhật thành công")
}

func (h *userHandlerImpl) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.WriteErrorResponse(c, apperror.ErrBadRequest.WithMessage("ID không hợp lệ"))
		return
	}

	if err := h.userService.Delete(c.Request.Context(), uint(id)); err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

func userEntityToResponse(user *entity.User) dto.UserResponse {
	resp := dto.UserResponse{
		ID:          user.ID,
		GoogleID:    user.GoogleID,
		Email:       user.Email,
		DisplayName: user.DisplayName,
		PhotoURL:    user.PhotoURL,
		Role:        user.Role,
		Status:      user.Status,
		CreatedAt:   user.CreatedAt,
		UpdatedAt:   user.UpdatedAt,
	}
	if user.DeletedAt.Valid {
		t := user.DeletedAt.Time
		resp.DeletedAt = &t
	}
	return resp
}
