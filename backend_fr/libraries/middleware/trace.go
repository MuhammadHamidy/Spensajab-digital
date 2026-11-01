package middleware

import (
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
	"github.com/facerec/facerec-be/libraries/helper"
)

func TraceMiddleware(c *fiber.Ctx) error {
	rid, ok := c.Locals("requestid").(string)
	if !ok || rid == "" {
		rid = c.Get(fiber.HeaderXRequestID)
	}

	// Ensure context has trace ID and logger
	ctx := c.UserContext()
	if ctx == nil {
		ctx = context.Background()
	}

	ctx = helper.WithTraceID(ctx, rid)
	logger := log.With().Str("request_id", rid).Logger()
	ctx = logger.WithContext(ctx)

	c.SetUserContext(ctx)
	return c.Next()
}
