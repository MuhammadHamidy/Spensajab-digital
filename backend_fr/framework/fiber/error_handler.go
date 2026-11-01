package fiber

import (
	"net/http"
	"time"

	"github.com/gofiber/fiber/v2"
	libErrors "github.com/facerec/facerec-be/libraries/errors"
)

func CustomErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	message := "Internal Server Error"

	if e, ok := err.(*libErrors.AppError); ok {
		code = e.Code
		message = e.Message
	} else if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		message = e.Message
	} else if err != nil {
		if message == "Internal Server Error" && err.Error() != "" {
		}
	}

	errorShort := http.StatusText(code)
	if errorShort == "" {
		errorShort = "Unknown Error"
	}

	if message == "" {
		message = errorShort
	}

	return c.Status(code).JSON(fiber.Map{
		"status":    code,
		"error":     errorShort,
		"message":   message,
		"timestamp": time.Now().Format(time.RFC3339),
	})
}
