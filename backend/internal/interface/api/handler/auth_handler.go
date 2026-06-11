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

// AuthHandler interface
type AuthHandler interface {
	GoogleSignIn(c *gin.Context)
	RefreshToken(c *gin.Context)
	GetMe(c *gin.Context)
	SignOut(c *gin.Context)
}

type authHandlerImpl struct {
	authService service.AuthService
	userService service.UserService
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(authService service.AuthService, userService service.UserService) AuthHandler {
	return &authHandlerImpl{
		authService: authService,
		userService: userService,
	}
}

// GoogleSignIn godoc
// @Summary      Sign in with Google
// @Description  Verifies a Google ID token and returns a signed JWT app token + refresh token pair. Pass the token from Google Sign-In SDK directly.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body      dto.GoogleSignInRequest  true  "Google ID token"
// @Success      200   {object}  dto.GoogleSignInResponse        "Sign-in successful"
// @Failure      400   {object}  response.ErrorResponse      "Missing or malformed request body"
// @Failure      401   {object}  response.ErrorResponse      "Invalid or expired Google ID token"
// @Failure      500   {object}  response.ErrorResponse      "Internal server error"
// @Router       /auth/google [post]
func (h *authHandlerImpl) GoogleSignIn(c *gin.Context) {
	var req dto.GoogleSignInRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.WriteErrorResponse(c, apperror.ErrBadRequest.WithMessage("id_token là bắt buộc"))
		return
	}

	resp, err := h.authService.GoogleSignIn(c.Request.Context(), req.IDToken)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	response.OK(c, resp, "Đăng nhập thành công")
}

// RefreshToken godoc
// @Summary      Refresh token pair
// @Description  Validates a refresh token and issues a new app token + refresh token pair (token rotation). The old refresh token is invalidated immediately.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body      dto.RefreshTokenRequest  true  "Refresh token"
// @Success      200   {object}  dto.RefreshTokenResponse        "New token pair issued"
// @Failure      400   {object}  response.ErrorResponse      "Missing or malformed request body"
// @Failure      401   {object}  response.ErrorResponse      "Refresh token invalid, expired, or already revoked"
// @Failure      500   {object}  response.ErrorResponse      "Internal server error"
// @Router       /auth/refresh [post]
func (h *authHandlerImpl) RefreshToken(c *gin.Context) {
	var req dto.RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.WriteErrorResponse(c, apperror.ErrBadRequest.WithMessage("refresh_token là bắt buộc"))
		return
	}

	resp, err := h.authService.RefreshToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	response.OK(c, resp, "Token đã được làm mới")
}

// GetMe godoc
// @Summary      Get current user
// @Description  Returns the authenticated user's basic profile derived from the JWT.
// @Tags         auth
// @Security     BearerAuth
// @Produce      json
// @Success      200  {object}  dto.UserResponse              "Authenticated user profile"
// @Failure      401  {object}  response.ErrorResponse    "Missing, invalid, or expired token"
// @Failure      500  {object}  response.ErrorResponse    "Internal server error"
// @Router       /auth/me [get]
func (h *authHandlerImpl) GetMe(c *gin.Context) {
	userID := middleware.GetUserID(c)
	user, err := h.userService.GetByID(c.Request.Context(), userID)
	if err != nil {
		response.WriteErrorResponse(c, err)
		return
	}
	response.OK(c, toUserResponse(user), "")
}

// SignOut godoc
// @Summary      Sign out
// @Description  Revokes the provided refresh token, blacklisting it immediately. The client is responsible for deleting its own app token from secure storage.
// @Tags         auth
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body      dto.SignOutRequest        true  "Refresh token to revoke"
// @Success      200   {object}  response.ErrorResponse      "Signed out successfully"
// @Failure      400   {object}  response.ErrorResponse      "Missing or malformed request body"
// @Failure      401   {object}  response.ErrorResponse      "Invalid or expired app token"
// @Failure      500   {object}  response.ErrorResponse      "Internal server error"
// @Router       /auth/signout [post]
func (h *authHandlerImpl) SignOut(c *gin.Context) {
	var req dto.SignOutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.WriteErrorResponse(c, apperror.ErrBadRequest.WithMessage("refresh_token là bắt buộc"))
		return
	}

	if err := h.authService.SignOut(c.Request.Context(), req.RefreshToken); err != nil {
		response.WriteErrorResponse(c, err)
		return
	}

	response.OK[any](c, nil, "Đăng xuất thành công")
}

func toUserResponse(user *entity.User) dto.UserResponse {
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
