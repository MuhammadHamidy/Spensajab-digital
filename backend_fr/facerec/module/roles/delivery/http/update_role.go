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
	UpdateRoleRequest struct {
		Name        string   `json:"name" validate:"required"`
		Description string   `json:"description"`
		IsActive    bool     `json:"is_active"`
		Permissions []string `json:"permissions"`
	}
)

// UpdateRole godoc
// @Summary      Update a role
// @Description  Update details and permissions of an existing role
// @Tags         roles
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id      path      string             true  "Role ID"
// @Param        request body      UpdateRoleRequest  true  "Role details"
// @Success      200     {object}  responses.Response[any]
// @Failure      400     {object}  responses.Response[any]
// @Failure      401     {object}  responses.Response[any]
// @Failure      404     {object}  responses.Response[any]
// @Failure      500     {object}  responses.Response[any]
// @Router       /roles/{id} [put]
func (h *RoleHandler) UpdateRole(c *fiber.Ctx) error {
	ctx := c.UserContext()

	id := c.Params("id")
	if id == "" {
		return h.handleError(c, errors.BadRequest("Invalid ID"))
	}

	institutionId, ok := c.Locals(middleware.XInstitutionId).(string)
	if !ok || institutionId == "" {
		return h.handleError(c, errors.Unauthorized("Invalid or missing institution context"))
	}

	userId, ok := c.Locals(middleware.XUserIdKey).(string)
	if !ok || userId == "" {
		return h.handleError(c, errors.Unauthorized("Invalid or missing user context"))
	}

	var req UpdateRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return h.handleError(c, errors.BadRequest("Invalid request body"))
	}

	if req.Name == "" {
		return h.handleError(c, errors.BadRequest("field name is required"))
	}

	role := domain.Role{
		Id:            id,
		InstitutionId: institutionId,
		Name:          req.Name,
		Description:   req.Description,
		IsActive:      req.IsActive,
		Permissions:   req.Permissions,
		UpdatedBy:     userId,
	}

	if err := h.useCase.Update(ctx, &role); err != nil {
		return h.handleError(c, err)
	}

	return c.Status(http.StatusOK).JSON(responses.Success[any](nil, "Role updated"))
}
