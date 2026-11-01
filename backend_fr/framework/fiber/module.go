// Package fiber provides an Uber Fx module for the Fiber web framework.
// It includes production-ready middleware (Logger, Recover, CORS, Helmet, etc.) and lifecycle management.
package fiber

import (
	"context"
	"fmt"
	"time"

	"github.com/goccy/go-json"
	otelfiber "github.com/gofiber/contrib/otelfiber/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"
	"github.com/rs/zerolog/log"
	"go.uber.org/fx"
)

var Module = fx.Module("fiber",
	fx.Provide(
		NewFiber,
	),
	fx.Invoke(
		StartFiber,
	),
)

type Config struct {
	AppName string `config:"app_name"`

	Port int `config:"port"`

	ReadTimeout time.Duration `config:"read_wait_timeout"`

	WriteTimeout time.Duration `config:"write_wait_timeout"`

	BodyLimit int `config:"body_limit"`

	CORSAllowedOrigins string `config:"cors_allowed_origins"`

	EnableCompress bool `config:"enable_compress"`
}

// NewFiber creates a new Fiber application with production defaults.
// It configures:
// - Custom JSON encoder/decoder (goccy/go-json)
// - Timeouts and body limits
// - Middleware: RequestID, Logger (Zerolog), Recover, Helmet, CORS, Compress.
func NewFiber(cfg *Config) *fiber.App {
	// Defaults
	readTimeout := cfg.ReadTimeout
	if readTimeout == 0 {
		readTimeout = 10 * time.Second
	}
	writeTimeout := cfg.WriteTimeout
	if writeTimeout == 0 {
		writeTimeout = 10 * time.Second
	}
	bodyLimit := cfg.BodyLimit
	if bodyLimit == 0 {
		bodyLimit = 4 * 1024 * 1024 // 4MB
	}

	app := fiber.New(fiber.Config{
		AppName:      cfg.AppName,
		ReadTimeout:  readTimeout,
		WriteTimeout: writeTimeout,
		BodyLimit:    bodyLimit,
		JSONEncoder:  json.Marshal,
		JSONDecoder:  json.Unmarshal,
		ErrorHandler: CustomErrorHandler,
	})

	// Middleware Stack
	app.Use(requestid.New())

	// Add OpenTelemetry middleware
	app.Use(otelfiber.Middleware())

	app.Use(logger.New(logger.Config{
		Format:     "${time} | ${status} | ${latency} | ${method} | ${path} | ${error}\n",
		TimeFormat: "2006-01-02 15:04:05",
		TimeZone:   "Local",
		// Use the global zerolog logger which enables hooks
		Output: log.Logger,
	}))

	app.Use(recover.New())
	app.Use(helmet.New())

	if cfg.CORSAllowedOrigins != "" {
		app.Use(cors.New(cors.Config{
			AllowOrigins: cfg.CORSAllowedOrigins,
		}))
	}

	if cfg.EnableCompress {
		app.Use(compress.New())
	}

	return app
}

// Router is the interface that modules must implement to register their routes.
type Router interface {
	RegisterRoutes(app *fiber.App)
}

// StartFiberParams holds the dependencies for starting the Fiber server.
type StartFiberParams struct {
	fx.In

	Lifecycle fx.Lifecycle
	App       *fiber.App
	Config    *Config
	Routers   []Router `group:"routers"`
}

// StartFiber registers start and stop hooks for the Fiber application.
// It accepts a list of Routers (via Fx group "routers") and registers them.
// It starts the server in a goroutine on startup and shuts it down gracefully on stop.
func StartFiber(params StartFiberParams) {
	// Register all provided routers
	for _, router := range params.Routers {
		router.RegisterRoutes(params.App)
	}

	params.Lifecycle.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			go func() {
				// Don't block OnStart with Listen
				if err := params.App.Listen(fmt.Sprintf(":%d", params.Config.Port)); err != nil {
					// In a real app we might want to panic or signal shutdown here
					// For now, we log to stdout/err. Fiber internal logs might also show up.
					fmt.Printf("Fiber failed to start: %v\n", err)
				}
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			return params.App.Shutdown()
		},
	})
}
