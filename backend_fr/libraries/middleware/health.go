package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/healthcheck"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"go.uber.org/fx"
)

// HealthModule provides the health check middleware.
var HealthModule = fx.Module("health",
	fx.Invoke(RegisterHealthCheck),
)

// RegisterHealthCheck registers liveness and readiness probes on the Fiber app.
// It checks the database and cache connection for readiness.
func RegisterHealthCheck(
	app *fiber.App,
	db *pgxpool.Pool,
	cache redis.UniversalClient,
) {
	app.Use(healthcheck.New(healthcheck.Config{
		LivenessProbe: func(ctx *fiber.Ctx) bool {
			return true
		},
		LivenessEndpoint: "/health/livez",
		ReadinessProbe: func(ctx *fiber.Ctx) bool {
			if db != nil {
				if err := db.Ping(ctx.UserContext()); err != nil {
					return false
				}
			}

			if cache != nil {
				if err := cache.Ping(ctx.Context()).Err(); err != nil {
					return false
				}
			}

			return true
		},
		ReadinessEndpoint: "/health/readyz",
	}))
}
