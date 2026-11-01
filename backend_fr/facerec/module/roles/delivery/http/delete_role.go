package http

import (
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/facerec/facerec-be/libraries/errors"
	"github.com/facerec/facerec-be/libraries/middleware"
	"github.com/facerec/facerec-be/libraries/responses"
)

// DeleteRole godoc
// @Summary      Delete a role
// @Description  Delete a role by ID
// @Tags         roles
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      string  true  "Role ID"
// @Success      200  {object}  responses.Response[any]
// @Failure      401  {object}  responses.Response[any]
// @Failure      404  {object}  responses.Response[any]
// @Failure      500  {object}  responses.Response[any]
// @Router       /roles/{id} [delete]
func (h *RoleHandler) DeleteRole(c *fiber.Ctx) error {
	ctx := c.UserContext()

	id := c.Params("id")
	if id == "" {
		return h.handleError(c, errors.BadRequest("Invalid ID"))
	}

	userId, ok := c.Locals(middleware.XUserIdKey).(string)
	if !ok || userId == "" {
		return h.handleError(c, errors.Unauthorized("Invalid or missing user context"))
	}

	institutionId, _ := c.Locals(middleware.XInstitutionId).(string)

	if err := h.useCase.Delete(ctx, institutionId, id); err != nil {
		return h.handleError(c, err)
	}

	return c.Status(http.StatusOK).JSON(responses.Success[any](nil, "Role deleted"))
}
