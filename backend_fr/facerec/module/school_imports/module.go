package school_imports

import (
	"github.com/facerec/facerec-be/facerec/module/school_imports/delivery/http"
	"github.com/facerec/facerec-be/facerec/module/school_imports/usecase"
	gofiber "github.com/gofiber/fiber/v2"
	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Provide(
		usecase.NewUseCase,
		http.NewSchoolImportHandler,
	),
	fx.Invoke(registerRoutes),
)

func registerRoutes(h *http.SchoolImportHandler, app *gofiber.App) {
	h.RegisterRoutes(app)
}
