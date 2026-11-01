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
	GetPermissionsResponse struct {
		Id          string `json:"id"`
		Code        string `json:"code"`
		Description string `json:"description"`
		Module      string `json:"module"`
		SubModule   string `json:"sub_module"`
		Page        string `json:"page"`
		Action      string `json:"action"`
		ScopeType   string `json:"scope_type"`
		IsSystem    bool   `json:"is_system"`
	}
)

// GetPermissions handles GET /roles/permissions
// Note: This endpoint might be logically under /permissions or /roles/permissions based on routes.
// TRD lists it as a master data endpoint.
// GetPermissions godoc
// @Summary      Get list of permissions
// @Description  Retrieve all available permissions for role assignment
// @Tags         roles
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        page       query     int     false  "Page number"
// @Param        page_size  query     int     false  "Items per page"
// @Param        search     query     string  false  "Search by code or description"
// @Success      200        {object}  responses.Response[[]GetPermissionsResponse]
// @Failure      500        {object}  responses.Response[any]
// @Router       /roles/permissions [get]
func (h *RoleHandler) GetPermissions(c *fiber.Ctx) error {
	ctx := c.UserContext()

	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "100")) // Permissions list can be large, default bigger or use pagination

	filter := domain.PermissionFilter{
		Pagination: types.Pagination{
			Page: page,
			Size: pageSize,
		},
		InstitutionId: c.Locals(middleware.XInstitutionId).(string),
		Search:        c.Query("search"),
	}

	permissions, err := h.useCase.ListPermissions(ctx, filter)
	if err != nil {
		return h.handleError(c, err)
	}

	result := make([]GetPermissionsResponse, len(permissions))
	for i, p := range permissions {
		result[i] = GetPermissionsResponse{
			Id:          p.Id,
			Code:        p.Code,
			Description: p.Description,
			Module:      p.Module,
			SubModule:   p.SubModule,
			Page:        p.Page,
			Action:      p.Action,
			ScopeType:   p.ScopeType,
			IsSystem:    p.IsSystem,
		}
	}

	return c.Status(http.StatusOK).JSON(responses.Success(result, "Permissions retrieved"))
}
