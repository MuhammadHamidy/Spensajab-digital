package http

import (
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/facerec/facerec-be/libraries/errors"
	"github.com/facerec/facerec-be/libraries/middleware"
	"github.com/facerec/facerec-be/libraries/responses"
	"github.com/facerec/facerec-be/facerec/module/users/domain"
)

// UserHandler handles HTTP requests for users module.
type UserHandler struct {
	useCase domain.UseCase
	auth    *middleware.AuthorizationMiddleware
}

// NewUserHandler creates a new UserHandler.
func NewUserHandler(useCase domain.UseCase, auth *middleware.AuthorizationMiddleware) *UserHandler {
	return &UserHandler{
		useCase: useCase,
		auth:    auth,
	}
}

// RegisterRoutes registers the routes for the users module.
func (h *UserHandler) RegisterRoutes(app *fiber.App) {
	group := app.Group("/users", middleware.TraceMiddleware)

	group.Get("/", h.auth.Authenticate("users.iam.users.view"), h.GetUsers)

	group.Post("/", h.auth.Authenticate("users.iam.users.create"), h.SyncUser)

	group.Patch("/:id/status", h.auth.Authenticate("users.iam.users.edit"), h.UpdateStatus)
	group.Post("/:id/roles", h.auth.Authenticate("users.iam.users.edit"), h.AssignRole)
}

// handleError handles errors by mapping them to standardized responses.
func (h *UserHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return c.Status(appErr.Code).JSON(responses.Fail(string(appErr.Type), appErr.Message))
	}

	return c.Status(http.StatusInternalServerError).JSON(responses.Fail("SYSTEM_ERROR", err.Error()))
}
