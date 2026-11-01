package apiresponses

import (
	"github.com/gofiber/fiber/v2"
)

// APIResponse represents the standard response envelope for the API.
type APIResponse struct {
	Status  string      `json:"status"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

// Success returns a success response envelope.
func Success(c *fiber.Ctx, statusCode int, message string, data interface{}) error {
	return c.Status(statusCode).JSON(APIResponse{
		Status:  "success",
		Message: message,
		Data:    data,
	})
}

// Fail returns a failure response envelope (usually for 4xx client errors).
func Fail(c *fiber.Ctx, statusCode int, message string) error {
	return c.Status(statusCode).JSON(APIResponse{
		Status:  "fail",
		Message: message,
	})
}

// Error returns an error response envelope (usually for 5xx server errors).
func Error(c *fiber.Ctx, statusCode int, message string) error {
	return c.Status(statusCode).JSON(APIResponse{
		Status:  "error",
		Message: message,
	})
}
