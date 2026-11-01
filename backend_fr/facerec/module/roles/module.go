package roles

import (
	gofiber "github.com/gofiber/fiber/v2"
	"go.uber.org/fx"
	"github.com/facerec/facerec-be/facerec/module/roles/delivery/http"
	"github.com/facerec/facerec-be/facerec/module/roles/domain"
	"github.com/facerec/facerec-be/facerec/module/roles/repository/postgresql"
	"github.com/facerec/facerec-be/facerec/module/roles/usecase"
)

// Module exports the roles module for Fx.
var Module = fx.Options(
	fx.Provide(
		fx.Annotate(
			postgresql.NewRepository,
			fx.As(new(domain.RoleRepository)),
		),
		fx.Annotate(
			usecase.NewUseCase,
			fx.As(new(domain.UseCase)),
		),
		http.NewRoleHandler,
	),
	fx.Invoke(registerRoutes),
)

func registerRoutes(h *http.RoleHandler, app *gofiber.App) {
	h.RegisterRoutes(app)
}
