package http

import (
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/facerec/facerec-be/libraries/errors"
	"github.com/facerec/facerec-be/libraries/responses"
)

type (
	GetRoleByIDResponse struct {
		Id            string   `json:"id"`
		InstitutionId string   `json:"institution_id"`
		Name          string   `json:"name"`
		Description   string   `json:"description"`
		IsActive      bool     `json:"is_active"`
		Permissions   []string `json:"permissions"`
	}
)

// GetRoleByID godoc
// @Summary      Get role details
// @Description  Retrieve specific role details with permissions
// @Tags         roles
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      string  true  "Role ID"
// @Success      200  {object}  responses.Response[GetRoleByIDResponse]
// @Failure      404  {object}  responses.Response[any]
// @Failure      500  {object}  responses.Response[any]
// @Router       /roles/{id} [get]
func (h *RoleHandler) GetRoleByID(c *fiber.Ctx) error {
	ctx := c.UserContext()

	id := c.Params("id")
	if id == "" {
		return h.handleError(c, errors.BadRequest("Invalid ID"))
	}

	role, err := h.useCase.Get(ctx, id)
	if err != nil {
		return h.handleError(c, err)
	}

	return c.Status(http.StatusOK).JSON(responses.Success(GetRoleByIDResponse{
		Id:            role.Id,
		InstitutionId: role.InstitutionId,
		Name:          role.Name,
		Description:   role.Description,
		IsActive:      role.IsActive,
		Permissions:   role.Permissions,
	}, "Role retrieved"))
}
