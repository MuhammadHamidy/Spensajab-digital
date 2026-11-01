package http

import (
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/facerec/facerec-be/libraries/errors"
	"github.com/facerec/facerec-be/libraries/middleware"
	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/facerec/facerec-be/facerec/module/users/domain"
)

type (
	AssignRoleRequest struct {
		RoleId        string `json:"role_id" validate:"required"`
		InstitutionId string `json:"institution_id" validate:"required"`
		GroupId       string `json:"group_id"` // Optional
	}
	AssignRoleResponse struct {
		Id string `json:"id"`
	}
)

// AssignRole godoc
// @Summary      Assign role to user
// @Description  Assign a specific role to a user within an institution
// @Tags         users
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id      path      string             true  "User ID"
// @Param        request body      AssignRoleRequest  true  "Assignment details"
// @Success      201     {object}  responses.Response[AssignRoleResponse]
// @Failure      400     {object}  responses.Response[any]
// @Failure      401     {object}  responses.Response[any]
// @Failure      500     {object}  responses.Response[any]
// @Router       /users/{id}/roles [post]
func (h *UserHandler) AssignRole(c *fiber.Ctx) error {
	ctx := c.UserContext()

	id := c.Params("id")
	if id == "" {
		return h.handleError(c, errors.BadRequest("Invalid ID"))
	}

	userId, ok := c.Locals(middleware.XUserIdKey).(string)
	if !ok || userId == "" {
		return h.handleError(c, errors.Unauthorized("Invalid or missing user context"))
	}

	var req AssignRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return h.handleError(c, errors.BadRequest("Invalid request body"))
	}

	cmd := domain.AssignRoleCommand{
		UserId:        id,
		RoleId:        req.RoleId,
		InstitutionId: req.InstitutionId,
		GroupId:       req.GroupId,
		AssignedBy:    userId,
	}

	assignmentId, err := h.useCase.AssignRole(ctx, cmd)
	if err != nil {
		return h.handleError(c, err)
	}

	return c.Status(http.StatusCreated).JSON(responses.Success(AssignRoleResponse{
		Id: assignmentId,
	}, "Role assigned"))
}
