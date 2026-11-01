package http

import (
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/facerec/facerec-be/libraries/errors"
	"github.com/facerec/facerec-be/libraries/middleware"
	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/facerec/facerec-be/facerec/module/roles/domain"
)

type (
	CreateRoleRequest struct {
		Name        string   `json:"name" validate:"required"`
		Description string   `json:"description"`
		IsActive    bool     `json:"is_active"` // Optional, default true handled logic? TRD doesn't specify default.
		Permissions []string `json:"permissions"`
	}
	CreateRoleResponse struct {
		Id string `json:"id"`
	}
)

// CreateRole godoc
// @Summary      Create a new role
// @Description  Create a new role with permissions for an institution
// @Tags         roles
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request body      CreateRoleRequest  true  "Role details"
// @Success      201     {object}  responses.Response[CreateRoleResponse]
// @Failure      400     {object}  responses.Response[any]
// @Failure      401     {object}  responses.Response[any]
// @Failure      500     {object}  responses.Response[any]
// @Router       /roles [post]
func (h *RoleHandler) CreateRole(c *fiber.Ctx) error {
	ctx := c.UserContext()

	institutionId, ok := c.Locals(middleware.XInstitutionId).(string)
	if !ok || institutionId == "" {
		return h.handleError(c, errors.Unauthorized("Invalid or missing institution context"))
	}

	userId, ok := c.Locals(middleware.XUserIdKey).(string)
	if !ok || userId == "" {
		return h.handleError(c, errors.Unauthorized("Invalid or missing user context"))
	}

	var req CreateRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return h.handleError(c, errors.BadRequest("Invalid request body"))
	}

	// Manual basic validation
	if req.Name == "" {
		return h.handleError(c, errors.BadRequest("field name is required"))
	}

	role := domain.Role{
		InstitutionId: institutionId,
		Name:          req.Name,
		Description:   req.Description,
		IsActive:      req.IsActive,
		Permissions:   req.Permissions,
		CreatedBy:     userId,
		UpdatedBy:     userId,
	}

	if err := h.useCase.Create(ctx, &role); err != nil {
		return h.handleError(c, err)
	}

	return c.Status(http.StatusCreated).JSON(responses.Success(CreateRoleResponse{
		Id: role.Id,
	}, "Role created"))
}
