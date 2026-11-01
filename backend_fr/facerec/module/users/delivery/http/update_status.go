package http

import (
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/facerec/facerec-be/libraries/errors"
	"github.com/facerec/facerec-be/libraries/middleware"
	"github.com/facerec/facerec-be/libraries/responses"
)

type (
	UpdateStatusRequest struct {
		Status string `json:"status" validate:"required"`
	}
)

// UpdateStatus godoc
// @Summary      Update user status
// @Description  Update the activation status of a user
// @Tags         users
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id      path      string               true  "User ID"
// @Param        request body      UpdateStatusRequest  true  "Status details"
// @Success      200     {object}  responses.Response[any]
// @Failure      400     {object}  responses.Response[any]
// @Failure      401     {object}  responses.Response[any]
// @Failure      404     {object}  responses.Response[any]
// @Failure      500     {object}  responses.Response[any]
// @Router       /users/{id}/status [patch]
func (h *UserHandler) UpdateStatus(c *fiber.Ctx) error {
	ctx := c.UserContext()

	id := c.Params("id")
	if id == "" {
		return h.handleError(c, errors.BadRequest("Invalid ID"))
	}

	userId, ok := c.Locals(middleware.XUserIdKey).(string)
	if !ok || userId == "" {
		return h.handleError(c, errors.Unauthorized("Invalid or missing user context"))
	}

	var req UpdateStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return h.handleError(c, errors.BadRequest("Invalid request body"))
	}

	if err := h.useCase.UpdateStatus(ctx, id, req.Status, userId); err != nil {
		return h.handleError(c, err)
	}

	return c.Status(http.StatusOK).JSON(responses.Success[any](nil, "User status updated"))
}
