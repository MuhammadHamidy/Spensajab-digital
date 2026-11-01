package cmd

import (
	"strings"

	internalConfig "github.com/facerec/facerec-be/facerec/config"
	_ "github.com/facerec/facerec-be/facerec/docs"
	"github.com/facerec/facerec-be/framework/common/logger"
	"github.com/facerec/facerec-be/framework/config"
	"github.com/facerec/facerec-be/framework/fiber"
	"github.com/facerec/facerec-be/framework/otel"
	"github.com/facerec/facerec-be/framework/postgres"
	"github.com/facerec/facerec-be/framework/redis"
	"github.com/facerec/facerec-be/libraries/idp"
	"github.com/facerec/facerec-be/libraries/middleware"
	gofiber "github.com/gofiber/fiber/v2"
	"github.com/spf13/cobra"
	filterSwagger "github.com/swaggo/fiber-swagger"
	"go.uber.org/fx"

	// Core User & Auth Modules
	"github.com/facerec/facerec-be/facerec/module/auth"
	"github.com/facerec/facerec-be/facerec/module/roles"
	"github.com/facerec/facerec-be/facerec/module/users"

	// School QR Attendance & Import Modules
	"github.com/facerec/facerec-be/facerec/module/school_attendances"
	"github.com/facerec/facerec-be/facerec/module/school_imports"
)

// @title           School QR Barcode Attendance API
// @version         1.0
// @description     API Documentation for School QR Barcode Attendance System (1 Admin, 20 Guru, Siswa)
// @termsOfService  http://swagger.io/terms/

// @contact.name    School Attendance Support
// @contact.email   support@sekolah.sch.id

// @license.name    Apache 2.0
// @license.url     http://www.apache.org/licenses/LICENSE-2.0.html

// @host            localhost:8080
// @BasePath        /
// @schemes         http
// @securityDefinitions.apikey ApiKeyAuth
// @in header
// @name Authorization
var serve = &cobra.Command{
	Use:   "serve",
	Short: "Start the application server",
	RunE:  serveE,
}

func serveE(cmd *cobra.Command, args []string) error {
	fx.New(
		// infrastructure
		logger.Module,
		config.Module,
		fiber.Module,
		otel.Module,
		postgres.Module,
		redis.Module,

		// supply config source & resolvers
		fx.Supply(
			fx.Annotated{
				Group: "config_options",
				Target: config.WithSources(
					config.FileSource("config/config.json"),
					config.EnvSource("APP_", func(key string) (string, bool) {
						return strings.ToLower(key), true
					}),
				),
			},
			fx.Annotated{
				Group: "config_options",
				Target: config.WithResolvers(
					config.FileResolver(),
					config.Base64Resolver(),
				),
			},
		),

		// configurations
		fx.Provide(
			config.ProvideConfig[internalConfig.ApplicationConfig](),
			internalConfig.Postgres,
			internalConfig.Redis,
			internalConfig.Fiber,
			internalConfig.Otel,
			internalConfig.Logger,
			internalConfig.InternalApp,
			middleware.NewAuthorizationMiddleware,
		),

		middleware.HealthModule,

		// Core User & Auth Modules
		roles.Module,
		users.Module,
		auth.Module,

		// School QR Attendance & Bulk Import Modules
		school_attendances.Module,
		school_imports.Module,

		fx.Provide(
			fx.Annotate(
				idp.NewIDP,
				fx.As(new(idp.IDPProvider)),
			),
		),
		fx.Invoke(func(app *gofiber.App) {
			app.Get("/swagger/*", filterSwagger.WrapHandler)
		}),
	).Run()

	return nil
}
