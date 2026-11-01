package school_attendances

import (
	"github.com/facerec/facerec-be/facerec/module/school_attendances/delivery/http"
	"github.com/facerec/facerec-be/facerec/module/school_attendances/repository/postgresql"
	"github.com/facerec/facerec-be/facerec/module/school_attendances/usecase"
	gofiber "github.com/gofiber/fiber/v2"
	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Provide(
		postgresql.NewRepository,
		usecase.NewUseCase,
		http.NewSchoolAttendanceHandler,
	),
	fx.Invoke(registerRoutes),
)

func registerRoutes(h *http.SchoolAttendanceHandler, app *gofiber.App) {
	h.RegisterRoutes(app)
}
