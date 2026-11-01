package auth

import (
	"github.com/facerec/facerec-be/facerec/config"
	"github.com/facerec/facerec-be/facerec/module/auth/delivery/http"
	"github.com/facerec/facerec-be/facerec/module/auth/domain"
	"github.com/facerec/facerec-be/facerec/module/auth/mailer"
	"github.com/facerec/facerec-be/facerec/module/auth/repository/postgresql"
	"github.com/facerec/facerec-be/facerec/module/auth/usecase"
	"github.com/gofiber/fiber/v2"
	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Provide(
		mailer.NewMailer,
		fx.Annotate(
			postgresql.NewRepository,
			fx.As(new(domain.AuthRepository)),
		),
		func(repo domain.AuthRepository, appConfig *config.InternalAppConfig, m mailer.Mailer) domain.UseCase {
			secret := "facerec-secret" // Default secret
			if appConfig.JwtSecret != "" {
				secret = appConfig.JwtSecret
			}
			return usecase.NewUseCase(repo, secret, m)
		},
		http.NewAuthHandler,
	),


	fx.Invoke(registerRoutes),
)

func registerRoutes(h *http.AuthHandler, app *fiber.App) {
	h.RegisterRoutes(app)
}
