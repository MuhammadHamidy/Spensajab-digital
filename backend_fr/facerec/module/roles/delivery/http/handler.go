package http

import (
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/facerec/facerec-be/libraries/errors"
	"github.com/facerec/facerec-be/libraries/middleware"
	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/facerec/facerec-be/facerec/module/roles/domain"
)

// RoleHandler handles HTTP requests for roles module.
type RoleHandler struct {
	useCase domain.UseCase
	auth    *middleware.AuthorizationMiddleware
}

// NewRoleHandler creates a new RoleHandler.
func NewRoleHandler(useCase domain.UseCase, auth *middleware.AuthorizationMiddleware) *RoleHandler {
	return &RoleHandler{
		useCase: useCase,
		auth:    auth,
	}
}

// RegisterRoutes registers the routes for the roles module.
func (h *RoleHandler) RegisterRoutes(app *fiber.App) {
	group := app.Group("/roles", middleware.TraceMiddleware)

	group.Get("/permissions", h.auth.Authenticate("roles.iam.roles.view"), h.GetPermissions)
	group.Get("/", h.auth.Authenticate("roles.iam.roles.view"), h.GetRoles)
	group.Get("/:id", h.auth.Authenticate("roles.iam.roles.view"), h.GetRoleByID)
	group.Post("/", h.auth.Authenticate("roles.iam.roles.create"), h.CreateRole)
	group.Put("/:id", h.auth.Authenticate("roles.iam.roles.edit"), h.UpdateRole)
	group.Delete("/:id", h.auth.Authenticate("roles.iam.roles.delete"), h.DeleteRole)
}

// handleError handles errors by mapping them to standardized responses.
func (h *RoleHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return c.Status(appErr.Code).JSON(responses.Fail(string(appErr.Type), appErr.Message))
	}

	return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SYSTEM_ERROR", err.Error()))
}
