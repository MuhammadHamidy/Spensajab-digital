package validation

import (
    "net/http"

    "github.com/gofiber/fiber/v2"
    "github.com/facerec/facerec-be/libraries/responses"
)

const ValidatedBodyKey = "validatedBody"

func ValidateBody(factory func() interface{}) fiber.Handler {
    return func(c *fiber.Ctx) error {
        dto := factory()
        if err := c.BodyParser(dto); err != nil {
            return c.Status(http.StatusBadRequest).JSON(responses.Fail("VALIDATION_ERROR", "invalid JSON body"))
        }

        if appErr := ValidateStruct(dto); appErr != nil {
            return c.Status(appErr.Code).JSON(responses.Fail(string(appErr.Type), appErr.Message))
        }

        c.Locals(ValidatedBodyKey, dto)
        return c.Next()
    }
}
