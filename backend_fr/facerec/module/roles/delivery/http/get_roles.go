package http

import (
	"net/http"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/facerec/facerec-be/libraries/middleware"
	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/facerec/facerec-be/libraries/types"
	"github.com/facerec/facerec-be/facerec/module/roles/domain"
)

type (
	GetRolesResponse struct {
		Id            string `json:"id"`
		InstitutionId string `json:"institution_id"`
		Name          string `json:"name"`
		Description   string `json:"description"`
		IsActive      bool   `json:"is_active"`
	}
)

// GetRoles godoc
// @Summary      Get list of roles
// @Description  Retrieve all roles with pagination and search
// @Tags         roles
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        page       query     int     false  "Page number"
// @Param        page_size  query     int     false  "Items per page"
// @Param        search     query     string  false  "Search by name"
// @Success      200        {object}  responses.Response[[]GetRolesResponse]
// @Failure      500        {object}  responses.Response[any]
// @Router       /roles [get]
func (h *RoleHandler) GetRoles(c *fiber.Ctx) error {
	ctx := c.UserContext()

	institutionId, _ := c.Locals(middleware.XInstitutionId).(string)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "10"))

	filter := domain.RoleFilter{
		Pagination: types.Pagination{
			Page: page,
			Size: pageSize,
		},
		InstitutionId: institutionId,
		Search:        c.Query("search"),
	}

	roles, total, err := h.useCase.FindAll(ctx, filter)
	if err != nil {
		return h.handleError(c, err)
	}

	result := make([]GetRolesResponse, len(roles))
	for i, roleItem := range roles {
		result[i] = GetRolesResponse{
			Id:            roleItem.Id,
			InstitutionId: roleItem.InstitutionId,
			Name:          roleItem.Name,
			Description:   roleItem.Description,
			IsActive:      roleItem.IsActive,
		}
	}

	meta := &responses.Meta{
		Page:       page,
		Size:       pageSize,
		Total:      total,
		TotalPages: (int(total) + pageSize - 1) / pageSize,
	}

	return c.Status(http.StatusOK).JSON(responses.SuccessWithMeta(result, "Roles retrieved", meta))
}
