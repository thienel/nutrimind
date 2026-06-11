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

// NewUserHandler creates a new user handler.
func NewUserHandler(userService service.UserService) UserHandler {
	return &userHandlerImpl{userService: userService}
}

// List godoc
// @Summary      List users
// @Description  Returns a paginated list of users. Supports filtering by email, display_name, role, status, and full-text search via the `search` param.
// @Tags         users
// @Security     BearerAuth
// @Produce      json
// @Param        limit   query     int     false  "Page size (default 20)"
// @Param        offset  query     int     false  "Offset (default 0)"
// @Param        search  query     string  false  "Full-text search across display_name and email"
// @Param        role    query     string  false  "Filter by role (USER | ADMIN)"
// @Param        status  query     string  false  "Filter by status (ACTIVE | INACTIVE)"
// @Success      200     {object}  dto.UserListResponse  "Paginated user list"
// @Failure      401     {object}  response.ErrorResponse           "Unauthorized"
// @Failure      500     {object}  response.ErrorResponse           "Internal server error"
// @Router       /users [get]
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

// GetByID godoc
// @Summary      Get user by ID
// @Description  Returns a single user by their numeric ID.
// @Tags         users
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      int  true  "User ID"
// @Success      200  {object}  dto.UserResponse            "User found"
// @Failure      400  {object}  response.ErrorResponse  "Invalid ID format"
// @Failure      401  {object}  response.ErrorResponse  "Unauthorized"
// @Failure      404  {object}  response.ErrorResponse  "User not found"
// @Failure      500  {object}  response.ErrorResponse  "Internal server error"
// @Router       /users/{id} [get]
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

// Update godoc
// @Summary      Update user
// @Description  Updates a user's role and/or status (admin operation).
// @Tags         users
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id    path      int                    true  "User ID"
// @Param        body  body      dto.UpdateUserRequest  true  "Fields to update"
// @Success      200   {object}  dto.UserResponse            "Updated user"
// @Failure      400   {object}  response.ErrorResponse  "Invalid ID or request body"
// @Failure      401   {object}  response.ErrorResponse  "Unauthorized"
// @Failure      404   {object}  response.ErrorResponse  "User not found"
// @Failure      500   {object}  response.ErrorResponse  "Internal server error"
// @Router       /users/{id} [put]
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

// Delete godoc
// @Summary      Delete user
// @Description  Soft-deletes a user by ID (sets deleted_at, preserves data).
// @Tags         users
// @Security     BearerAuth
// @Produce      json
// @Param        id   path  int  true  "User ID"
// @Success      204  "User deleted"
// @Failure      400  {object}  response.ErrorResponse  "Invalid ID format"
// @Failure      401  {object}  response.ErrorResponse  "Unauthorized"
// @Failure      404  {object}  response.ErrorResponse  "User not found"
// @Failure      500  {object}  response.ErrorResponse  "Internal server error"
// @Router       /users/{id} [delete]
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
